/**
 * 자동 프로브 6종 실행기.
 *
 *   npm run probe                       전체 실행
 *   npm run probe -- --limit=5          앞에서 5개만
 *   npm run probe -- --only=coupang,toss
 *   npm run probe -- --signals=overseas_access,i18n_ui
 *   npm run probe -- --dry-run          파일에 쓰지 않고 결과만 출력
 *
 * 산출물
 *   data/services/<id>.json   측정값 (measured_at 매번 갱신)
 *   data/changes/<date>.json  실제로 값이 바뀐 것만 (재방문 유도 페이지의 근거)
 *   data/runs/latest.json     실행 요약
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { LLM, PATHS } from './config.js';
import { closeBrowser } from './lib/browser.js';
import { mapWithConcurrency } from './lib/limiter.js';
import { errMessage, log } from './lib/log.js';
import { applyProbeResult, markUnmeasured } from './lib/signal.js';
import { listServiceIds, loadSeeds, loadService, mergeSeed, saveService, writeJson } from './lib/store.js';
import { probeAppAvailability } from './probes/app-availability.js';
import { probeI18nUi } from './probes/i18n-ui.js';
import { probeOverseasAccess, resolveVantagePoint, type VantagePoint } from './probes/overseas-access.js';
import { probePaymentGate } from './probes/payment-gate.js';
import { probeSignupPhoneAuth } from './probes/signup-phone-auth.js';
import { llmUsage, probeSupportEn } from './probes/support-en.js';
import { AUTO_SIGNAL_KEYS, type AutoSignalKey, type ChangeEntry, type RunSummary, type Service } from './types.js';

interface Options {
  only: string[] | null;
  limit: number | null;
  signals: AutoSignalKey[];
  dryRun: boolean;
}

function parseArgs(argv: readonly string[]): Options {
  const get = (name: string): string | null => {
    const hit = argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : null;
  };
  const rawSignals = get('signals');
  const signals = rawSignals
    ? (rawSignals.split(',').map((s) => s.trim()) as AutoSignalKey[]).filter((s) =>
        (AUTO_SIGNAL_KEYS as readonly string[]).includes(s),
      )
    : [...AUTO_SIGNAL_KEYS];
  const limitRaw = get('limit');
  return {
    only: get('only')?.split(',').map((s) => s.trim()).filter(Boolean) ?? null,
    limit: limitRaw ? Number(limitRaw) : null,
    signals,
    dryRun: argv.includes('--dry-run'),
  };
}

/** 각 프로브의 미측정 기본값 — 스키마 enum과 맞아야 한다 */
const UNKNOWN_VALUE: Record<AutoSignalKey, unknown> = {
  overseas_access: 'unknown',
  i18n_ui: null,
  signup_phone_auth: 'unknown',
  app_availability: null,
  payment_gate: null,
  support_en: 'unknown',
};

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const startedAt = new Date();

  // 1. 시드 동기화 (신규 서비스가 있으면 이번 실행부터 측정된다)
  const seeds = await loadSeeds();
  for (const seed of seeds) {
    const existing = await loadService(seed.id);
    await saveService(mergeSeed(seed, existing));
  }

  let ids = await listServiceIds();
  if (options.only) ids = ids.filter((id) => options.only!.includes(id));
  if (options.limit !== null && Number.isFinite(options.limit)) ids = ids.slice(0, options.limit);

  log.info(
    `대상 ${ids.length}개 서비스 × 시그널 ${options.signals.length}종 (${options.signals.join(', ')})`,
  );

  const vantage = await resolveVantagePoint();
  log.info(
    `측정 지점: ${vantage.id} country=${vantage.country ?? 'unknown'} region=${vantage.region ?? 'unknown'}`,
  );
  if (vantage.country === 'kr') {
    log.warn('측정 지점이 한국이다. "외국인의 시점"이 아니므로 overseas_access 결과를 신뢰하지 말 것.');
  }

  const now = startedAt.toISOString();
  const changes: ChangeEntry[] = [];
  const errors: RunSummary['errors'] = [];
  let signalsMeasured = 0;
  let signalsUnknown = 0;

  // 서비스 단위로 병렬. 호스트별 간격은 http 계층이 강제하므로 여기서는 넉넉히 잡는다.
  await mapWithConcurrency(ids, 4, async (id) => {
    const service = await loadService(id);
    if (!service) return;

    log.group(`${id}`);
    for (const key of options.signals) {
      try {
        const result = await runProbe(key, service, vantage);
        if (result === null) {
          service.signals[key] = markUnmeasured(
            service.signals[key] as never,
            UNKNOWN_VALUE[key] as never,
            key,
            'probe returned null',
            now,
          ) as never;
          signalsUnknown += 1;
          continue;
        }
        const applied = applyProbeResult(service.signals[key] as never, result as never, key, now);
        service.signals[key] = applied.signal as never;
        if (applied.changed) {
          changes.push({
            service_id: id,
            signal: key,
            from: applied.previousValue,
            to: result.value,
            changed_at: now,
            // 어디서 잰 실행이 이 변경을 봤는지. 측정 지점이 바뀐 날의 변경은
            // 서비스가 바뀐 것이 아니라 우리가 옮겨간 것일 수 있다. (D-14)
            vantage_point: {
              country: vantage.country,
              region: vantage.region,
              ip_asn: vantage.ip_asn,
            },
          });
          log.info(`  ${key}: ${short(applied.previousValue)} → ${short(result.value)}  (변경)`);
        } else {
          log.info(`  ${key}: ${short(result.value)}`);
        }
        if (result.confidence === 'unknown') signalsUnknown += 1;
        else signalsMeasured += 1;
      } catch (e) {
        const message = errMessage(e);
        errors.push({ service_id: id, signal: key, message });
        log.warn(`  ${key}: 실패 — ${message}`);
        service.signals[key] = markUnmeasured(
          service.signals[key] as never,
          UNKNOWN_VALUE[key] as never,
          key,
          message,
          now,
        ) as never;
        signalsUnknown += 1;
      }
    }
    log.groupEnd();

    if (!options.dryRun) await saveService(service);
  });

  await closeBrowser();

  const finishedAt = new Date();
  const summary: RunSummary = {
    started_at: now,
    finished_at: finishedAt.toISOString(),
    duration_ms: finishedAt.getTime() - startedAt.getTime(),
    vantage_point: vantage,
    services_total: (await listServiceIds()).length,
    services_probed: ids.length,
    signals_measured: signalsMeasured,
    signals_unknown: signalsUnknown,
    changes: changes.length,
    errors,
    llm: {
      calls: llmUsage.calls,
      cached: llmUsage.cached,
      input_tokens: llmUsage.inputTokens,
      output_tokens: llmUsage.outputTokens,
      model: llmUsage.calls > 0 ? LLM.model : null,
    },
  };

  if (!options.dryRun) {
    const date = now.slice(0, 10);
    const file = path.join(PATHS.changes, `${date}.json`);

    // 같은 날 두 번 돌면 덮어쓰던 것을 이어붙이도록 바꿨다.
    // 2026-08-15 에 실제로 두 번(KR·US) 돌았고, 앞 실행의 변경 4건이 사라졌다.
    // git 로그에 쌓이는 변경 이력이 이 프로젝트의 해자라 한 건도 버리면 안 된다.
    let previous: ChangeEntry[] = [];
    try {
      const existing = JSON.parse(await readFile(file, 'utf8')) as { changes?: ChangeEntry[] };
      if (Array.isArray(existing.changes)) previous = existing.changes;
    } catch {
      /* 그날 첫 실행이면 파일이 없다 */
    }
    const seen = new Set(previous.map((c) => `${c.service_id}|${c.signal}|${c.changed_at}`));
    const merged = [
      ...previous,
      ...changes.filter((c) => !seen.has(`${c.service_id}|${c.signal}|${c.changed_at}`)),
    ];

    await writeJson(file, { date, generated_at: now, changes: merged });
    await writeJson(path.join(PATHS.runs, 'latest.json'), summary);
  }

  log.info(
    `완료 — 측정 ${signalsMeasured}건, 미측정/unknown ${signalsUnknown}건, 변경 ${changes.length}건, 오류 ${errors.length}건, ${(summary.duration_ms / 1000).toFixed(1)}초`,
  );
  if (errors.length > 0) {
    log.warn('오류 목록:');
    for (const e of errors.slice(0, 20)) log.warn(`  ${e.service_id}/${e.signal}: ${e.message}`);
  }
}

async function runProbe(
  key: AutoSignalKey,
  service: Service,
  vantage: VantagePoint,
): Promise<{ value: unknown; confidence: 'auto' | 'unknown' | 'community' | 'conflicting'; evidence: Record<string, unknown> | null } | null> {
  switch (key) {
    case 'overseas_access':
      return probeOverseasAccess(service, vantage);
    case 'i18n_ui':
      return probeI18nUi(service);
    case 'signup_phone_auth':
      return probeSignupPhoneAuth(service);
    case 'app_availability':
      return probeAppAvailability(service);
    case 'payment_gate':
      return probePaymentGate(service);
    case 'support_en':
      // 이전 판정을 넘겨서, 페이지 내용이 그대로면 LLM을 다시 호출하지 않게 한다 (비용 통제)
      return probeSupportEn(service, service.signals.support_en);
    default: {
      const exhaustive: never = key;
      throw new Error(`알 수 없는 시그널: ${String(exhaustive)}`);
    }
  }
}

function short(value: unknown): string {
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  return (s ?? 'null').length > 70 ? `${(s ?? '').slice(0, 67)}...` : (s ?? 'null');
}

main().catch(async (e: unknown) => {
  log.error(errMessage(e));
  await closeBrowser();
  process.exitCode = 1;
});
