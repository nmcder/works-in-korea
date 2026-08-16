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
import {
  probeOverseasAccess,
  readByVantage,
  resolveVantagePoint,
  vantageKey,
  type VantagePoint,
} from './probes/overseas-access.js';
import { probePaymentGate } from './probes/payment-gate.js';
import { probeSignupPhoneAuth } from './probes/signup-phone-auth.js';
import { llmUsage, probeSupportEn } from './probes/support-en.js';
import {
  AUTO_SIGNAL_KEYS,
  type AutoSignalKey,
  type ChangeEntry,
  type Confidence,
  type RunSummary,
  type Service,
} from './types.js';

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
      /*
       * 사람이 눈으로 확인한 값은 자동 측정이 건드리지 않는다.
       *
       * 2026-08-16 에 언어 프로브를 고치고 전체를 다시 돌렸더니, 사람이 확인해 둔
       * **25건이 통째로 지워졌다.** 지마켓 ["ko","en","zh"] → null, 고속버스
       * ["ko","en","zh","ja"] → null 같은 식이다. 기계가 못 본 것이 사람이 본 것을
       * 덮어쓴 것이고, 이건 측정이 아니라 파괴다.
       *
       * 자동이 더 많이 찾는 경우도 있지만(우리은행에서 6개 언어를 찾았다) 그걸
       * 이유로 덮게 두면 반대 방향 사고를 막을 수 없다. 사람 값은 사람이 다시
       * 확인할 때만 바뀐다 — 그래서 화면에 확인 날짜가 붙어 있는 것이다.
       *
       * 자동에 맡기고 싶으면 그 값을 지우면 된다. 지우는 것은 사람의 결정이어야 한다.
       */
      if (service.signals[key]?.confidence === 'manual') {
        log.info(`  ${key}: 사람이 확인한 값이라 건너뜀`);
        continue;
      }

      try {
        const previousSignal = service.signals[key];
        const result = await runProbe(key, service, vantage, now);
        /*
         * **오늘 못 본 것이 어제 본 것을 지우지 않는다.**
         *
         * markUnmeasured 는 이전 값을 지키도록 만들어져 있는데, 이 경로를 타는 것은
         * 프로브가 아예 null 을 돌려줬을 때뿐이었다. 프로브들은 대개 그러지 않고
         * `{ value: null, confidence: 'unknown' }` 을 돌려주는데, 그건 아래
         * applyProbeResult 로 흘러가서 멀쩡한 값을 덮어썼다.
         *
         * 2026-08-16 밤 크론에서 실제로 그랬다. 미국 러너에서 KT 는 robots.txt 를
         * 못 읽었고(연결 타임아웃), 멜론티켓은 423 을 받았고, SKT 는 렌더가 30초를
         * 넘겼다. 셋 다 "사이트에 닿지 못했다"인데 그 결과로 전날 확인해 둔 언어
         * 목록이 지워졌다. 신한은행의 가입 조건과 리디북스의 영어 지원도 같은 식으로
         * 날아갔다 — 하루치 네트워크 사정이 데이터를 먹은 것이다.
         *
         * 값에 측정 시각이 붙어 있으므로 낡은 것은 화면에서 낡은 채로 보인다.
         * "2026-08-15 에 확인함"이 "모름"보다 언제나 낫다.
         *
         * ※ overseas_access 는 영향이 없다. 거기서 차단은 unknown 이 아니라
         *   'blocked' 라는 **값**이고, 그건 지워지지 않고 그대로 기록된다.
         */
        const failed =
          result === null
            ? 'probe returned null'
            : result.confidence === 'unknown'
              ? String(
                  (result.evidence as { not_measured?: unknown } | null)?.not_measured ??
                    'unknown 으로 돌아옴',
                )
              : null;

        const hadValue = previousSignal !== undefined && previousSignal.measured_at !== null;

        if (failed !== null && hadValue) {
          service.signals[key] = markUnmeasured(
            service.signals[key] as never,
            UNKNOWN_VALUE[key] as never,
            key,
            failed,
            now,
          ) as never;
          signalsUnknown += 1;
          log.info(`  ${key}: 못 쟀다 (${failed.slice(0, 60)}) — 이전 값을 지킨다`);
          continue;
        }

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

        /*
         * 측정 지점이 옮겨가서 생긴 차이는 "바뀌었다"가 아니다.
         *
         * 러너가 매번 다른 지역에 뜬다. 2026-08-15 하루에만 KR·Washington·Illinois·
         * California·UK 다섯 곳에서 쟀고, 그때마다 은행·정부 사이트 몇 곳이 뒤집혔다.
         * 그걸 그대로 기록하면 변경 이력이 노이즈로 차고, 읽는 사람은 그 회사들이
         * 뭔가 바꾼 줄 알게 된다. 이 프로젝트의 해자가 변경 이력인데 그게 망가진다.
         *
         * 그래서 **같은 지점끼리만** 비교한다. 이 지점에서 재 본 적이 없으면
         * 비교할 대상이 없으므로 변경으로 세지 않는다.
         */
        let vantageExplained = false;
        if (key === 'overseas_access' && applied.changed) {
          const prevHere = readByVantage(previousSignal as never)[vantageKey(vantage)];
          vantageExplained = prevHere === undefined || prevHere.value === result.value;
        }

        if (applied.changed && !vantageExplained) {
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
      model: llmUsage.calls > 0 || llmUsage.failures > 0 ? LLM.model : null,
      failures: llmUsage.failures,
      last_error: llmUsage.lastError,
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
  now: string,
  // 신뢰도 종류를 여기에 손으로 늘어놓으면 types.ts 에 하나 추가할 때마다 여기서 깨진다.
  // 실제로 'manual' 을 추가하다가 깨졌다. 타입을 그대로 가져다 쓴다.
): Promise<{ value: unknown; confidence: Confidence; evidence: Record<string, unknown> | null } | null> {
  switch (key) {
    case 'overseas_access':
      // 이전 지점별 기록을 넘겨서 누적시킨다
      return probeOverseasAccess(service, vantage, now, service.signals.overseas_access);
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
