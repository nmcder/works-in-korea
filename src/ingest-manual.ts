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

async function main(): Promise<void> {
  const file = process.argv.find((a) => a.startsWith('--file='))?.split('=')[1];
  const dryRun = process.argv.includes('--dry-run');
  if (!file) {
    console.error('사용법: npm run ingest-manual -- --file=answers.json [--dry-run]');
    process.exit(1);
  }

  const raw = JSON.parse(await readFile(file, 'utf8')) as unknown;
  const answers: Answer[] = Array.isArray(raw)
    ? (raw as Answer[])
    : ((raw as { answers?: Answer[] }).answers ?? []);
  if (!Array.isArray(answers) || answers.length === 0) {
    console.error('답 배열을 찾지 못했다. 최상위가 배열이거나 { "answers": [...] } 여야 한다.');
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
