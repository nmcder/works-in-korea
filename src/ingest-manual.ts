/**
 * 사람이 눈으로 확인한 값을 데이터에 넣는다.
 *   npm run ingest-manual -- --file=answers.json
 *   npm run ingest-manual -- --file=answers.json --dry-run
 *
 * ── 이 파일의 존재 이유는 "받아 적기"가 아니라 "거르기"다
 *
 * 사람이든 브라우저를 쓰는 도우미든, 확인하지 못한 것을 그럴듯하게 적어 낼 수 있다.
 * 2026-08-15 에 앱 ID를 이름으로 찾다가 CGV 에 롯데시네마 앱을 붙일 뻔했다.
 * 그때 살린 것은 검증 절차였지 성의가 아니었다.
 *
 * 그래서 값만으로는 아무것도 기록하지 않는다. 세 가지가 모두 있어야 받는다.
 *
 *   1. 실제로 연 주소 (`url`)
 *   2. 화면에서 본 것을 그대로 옮긴 문장 (`saw`) — 판단이 아니라 관찰
 *   3. 확인한 날짜 (`checked_at`)
 *
 * `saw` 가 없거나 너무 짧으면 거절한다. "확인했음" 같은 말은 관찰이 아니다.
 * 애매하면 unknown 으로 두는 것이 이 제품의 자산이므로, 거절은 실패가 아니다.
 *
 * ── 기록되는 방식
 *
 *   method: 'manual'  ·  confidence: 'manual'
 *
 * 화면에 "사람이 직접 확인 · 2026-08-16" 으로 나간다. 자동값과 섞이지 않는다.
 * 매일 다시 재지지 않으므로 날짜가 곧 유통기한이고, 그걸 숨기지 않는다.
 */
import { readFile } from 'node:fs/promises';
import { loadService, saveService } from './lib/store.js';
import type { Service, SignalKey } from './types.js';

const CHECKABLE = ['signup_phone_auth', 'i18n_ui', 'support_en'] as const;
type Checkable = (typeof CHECKABLE)[number];

const ALLOWED: Record<Checkable, (v: unknown) => boolean> = {
  signup_phone_auth: (v) =>
    v === 'required' || v === 'any_phone' || v === 'optional' || v === 'not_required' || v === 'unknown',
  i18n_ui: (v) =>
    v === null ||
    (Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === 'string' && /^[a-z]{2}$/.test(x))),
  support_en: (v) => v === 'yes' || v === 'no' || v === 'unknown',
};

/** 이만큼도 안 적었으면 보고 적은 것이 아니다 */
const MIN_SAW = 12;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

interface Answer {
  service_id?: unknown;
  checked_at?: unknown;
  [key: string]: unknown;
}

interface Field {
  value?: unknown;
  url?: unknown;
  saw?: unknown;
}

function reject(id: string, key: string, why: string): void {
  console.log(`  ✕ ${id.padEnd(20)} ${key.padEnd(20)} ${why}`);
}

function readJsonAnswers(text: string): Answer[] {
  const raw = JSON.parse(text) as unknown;
  return Array.isArray(raw) ? (raw as Answer[]) : ((raw as { answers?: Answer[] }).answers ?? []);
}

/**
 * 운영자가 손으로 채운 작업표(docs/09-byhand.md)를 읽는다.
 *
 * 왜 마크다운을 읽는가: 87개 항목을 JSON 으로 적게 하면 중간에 쉼표 하나가 빠지고,
 * 그걸 찾느라 지치고, 결국 안 하게 된다. 운영자는 코드를 쓰지 않는 사람이다.
 * 그래서 만들어 준 표에 두 줄만 채우게 하고 같은 파일을 그대로 다시 읽는다.
 *
 * 찾는 것은 이 네 줄뿐이다. 나머지 설명글은 전부 무시한다.
 *   ### 이름   `service-id`
 *   **n. 제목**  `signal_key`
 *   열기: <주소>
 *   답: <값>
 *   본 것: <관찰>
 */
function parseWorksheet(text: string): Answer[] {
  const lines = text.split(/\r?\n/);
  const byService = new Map<string, Answer>();
  let serviceId = '';
  let key = '';
  let url = '';

  const flush = (value: string, saw: string): void => {
    if (!serviceId || !key || !value) return;
    const v = normalizeWorksheetValue(key, value);
    if (v === undefined) {
      /*
       * 알아볼 수 없는 답을 조용히 버리면 안 된다. 운영자는 적었다고 생각하고
       * 넘어가는데 데이터에는 아무것도 안 들어간다 — 그 사실을 영영 모른다.
       * "모름"은 일부러 비운 것이니 조용히 넘기고, 나머지는 소리 내어 알린다.
       */
      if (!/^(모름|unknown|-)$/i.test(value.trim())) {
        console.log(
          `  ⚠ ${serviceId.padEnd(20)} ${key.padEnd(20)} "${value}" 를 알아보지 못했다 — 기록하지 않았다`,
        );
      }
      return;
    }
    const entry = byService.get(serviceId) ?? { service_id: serviceId };
    (entry as Record<string, unknown>)[key] = { value: v, url, saw };
    byService.set(serviceId, entry);
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';

    const svc = /^###\s+.*`([a-z0-9][a-z0-9-]{1,48})`\s*$/.exec(line);
    if (svc) {
      serviceId = svc[1]!;
      key = '';
      continue;
    }
    const sig = /^\*\*\d+\..*`(signup_phone_auth|i18n_ui|support_en)`\s*$/.exec(line);
    if (sig) {
      key = sig[1]!;
      url = '';
      continue;
    }
    const open = /^열기:\s*(\S+)/.exec(line);
    if (open) {
      url = open[1]!;
      continue;
    }
    const ans = /^답:\s*(.*)$/.exec(line);
    if (ans) {
      const value = (ans[1] ?? '').trim();
      // 바로 다음 줄이 "본 것:" 이다. 여러 줄로 적었을 수도 있으니 다음 표시줄까지 모은다.
      const sawLines: string[] = [];
      for (let j = i + 1; j < lines.length; j += 1) {
        const l = lines[j] ?? '';
        if (/^본 것:\s*/.test(l)) {
          sawLines.push(l.replace(/^본 것:\s*/, ''));
          continue;
        }
        if (sawLines.length === 0) break;
        if (/^(###|\*\*\d+\.|열기:|답:|---)/.test(l)) break;
        sawLines.push(l);
      }
      flush(value, sawLines.join(' ').trim());
      continue;
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  return [...byService.values()].map((a) => ({ ...a, checked_at: today }));
}

/** 사람이 적은 낱말을 스키마 값으로. 알아볼 수 없으면 undefined — 건너뛴다. */
function normalizeWorksheetValue(key: string, raw: string): unknown {
  const v = raw.trim().toLowerCase();
  if (v === '' || v === '모름' || v === 'unknown' || v === '-') return undefined;

  if (key === 'signup_phone_auth') {
    if (['required', '필수', '한국번호만'].includes(v)) return 'required';
    if (['any_phone', 'any', '해외번호도', '해외 번호도'].includes(v)) return 'any_phone';
    if (['optional', '선택'].includes(v)) return 'optional';
    if (['not_required', '없음', '인증없음'].includes(v)) return 'not_required';
    return undefined;
  }
  if (key === 'support_en') {
    if (['yes', 'y', '있음', '있다'].includes(v)) return 'yes';
    if (['no', 'n', '없음', '없다'].includes(v)) return 'no';
    return undefined;
  }
  if (key === 'i18n_ui') {
    // "ko en" · "ko, en" · "ko/en" 다 받는다. 사람이 어떻게 적을지 모른다.
    const codes = [...new Set(v.split(/[\s,/·]+/).filter((c) => /^[a-z]{2}$/.test(c)))];
    return codes.length > 0 ? codes.sort() : undefined;
  }
  return undefined;
}

async function main(): Promise<void> {
  const file = process.argv.find((a) => a.startsWith('--file='))?.split('=')[1];
  const dryRun = process.argv.includes('--dry-run');
  if (!file) {
    console.error('사용법: npm run ingest-manual -- --file=answers.json [--dry-run]');
    process.exit(1);
  }

  const text = await readFile(file, 'utf8');
  const answers: Answer[] = file.endsWith('.md') ? parseWorksheet(text) : readJsonAnswers(text);
  if (!Array.isArray(answers) || answers.length === 0) {
    console.error(
      file.endsWith('.md')
        ? '채워진 항목을 찾지 못했다. `답:` 과 `본 것:` 두 줄에 내용이 있어야 한다.'
        : '답 배열을 찾지 못했다. 최상위가 배열이거나 { "answers": [...] } 여야 한다.',
    );
    process.exit(1);
  }

  const now = new Date().toISOString();
  let written = 0;
  let rejected = 0;
  let skipped = 0;
  const touched = new Map<string, Service>();

  for (const a of answers) {
    const id = typeof a.service_id === 'string' ? a.service_id : '';
    if (!id) {
      console.log('  ✕ (service_id 없음)');
      rejected += 1;
      continue;
    }

    const service = touched.get(id) ?? (await loadService(id));
    if (!service) {
      reject(id, '-', '그런 서비스가 없다');
      rejected += 1;
      continue;
    }

    const checkedAt = typeof a.checked_at === 'string' ? a.checked_at : '';
    if (!DATE.test(checkedAt)) {
      reject(id, '-', 'checked_at 이 없거나 YYYY-MM-DD 형식이 아니다');
      rejected += 1;
      continue;
    }
    // 앞날 날짜는 받지 않는다 — 확인하지 않은 것을 확인했다고 적은 것이다
    if (checkedAt > now.slice(0, 10)) {
      reject(id, '-', `checked_at 이 미래다 (${checkedAt})`);
      rejected += 1;
      continue;
    }

    for (const key of CHECKABLE) {
      const f = a[key] as Field | undefined;
      if (f === undefined || f === null) continue;

      if (!ALLOWED[key](f.value)) {
        reject(id, key, `값이 허용되지 않는다: ${JSON.stringify(f.value)}`);
        rejected += 1;
        continue;
      }

      // unknown 을 굳이 기록할 이유가 없다. 이미 비어 있고, 비어 있는 이유는 화면이 따로 설명한다.
      if (f.value === 'unknown' || f.value === null) {
        skipped += 1;
        continue;
      }

      const url = typeof f.url === 'string' ? f.url.trim() : '';
      if (!/^https?:\/\/\S+$/.test(url)) {
        reject(id, key, '실제로 연 주소(url)가 없다');
        rejected += 1;
        continue;
      }

      const saw = typeof f.saw === 'string' ? f.saw.trim() : '';
      if (saw.length < MIN_SAW) {
        reject(id, key, `본 것을 적지 않았다 (saw 가 ${saw.length}자)`);
        rejected += 1;
        continue;
      }

      const prev = service.signals[key as SignalKey];
      const same = JSON.stringify(prev?.value) === JSON.stringify(f.value);

      service.signals[key as SignalKey] = {
        value: f.value,
        measured_at: `${checkedAt}T00:00:00.000Z`,
        first_seen_at: same ? (prev?.first_seen_at ?? `${checkedAt}T00:00:00.000Z`) : `${checkedAt}T00:00:00.000Z`,
        last_changed_at: same ? (prev?.last_changed_at ?? null) : `${checkedAt}T00:00:00.000Z`,
        method: 'manual',
        confidence: 'manual',
        evidence: { checked_by: 'operator', url, saw: saw.slice(0, 500), recorded_at: now },
      } as never;

      touched.set(id, service);
      written += 1;
      console.log(`  ✓ ${id.padEnd(20)} ${key.padEnd(20)} ${JSON.stringify(f.value)}`);
    }
  }

  if (!dryRun) {
    for (const service of touched.values()) await saveService(service);
  }

  console.log('');
  console.log(
    `기록 ${written}건 · 거절 ${rejected}건 · 건너뜀(unknown) ${skipped}건${dryRun ? '  [--dry-run: 저장 안 함]' : ''}`,
  );
  if (rejected > 0) {
    console.log('거절된 것은 다시 확인해서 보내면 된다. 애매한 채로 기록하지 않는다.');
  }
  if (!dryRun && written > 0) {
    console.log('다음: npm run validate 로 확인하고 커밋한다.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
