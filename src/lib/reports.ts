/**
 * 커뮤니티 제보 — 파싱, 개인정보 차단, 집계.
 *
 * 왜 존재하나: 시그널 8종 중 2종(해외 카드 결제·해외 번호 SMS)은 실제 결제와 실제 인증
 * 요청 없이 확인할 방법이 없고, 그것은 하지 않기로 한 일이다 (절대규칙 4).
 * 게다가 시드의 상당수는 robots.txt·봇 차단·무응답으로 자동 측정이 원천 불가다 (D-9, D-14).
 * 그 서비스들에게 제보는 보완이 아니라 **유일한 데이터원**이다.
 *
 * 설계에서 양보하지 않는 것 하나: **개인정보를 저장하지 않는다** (절대규칙 2).
 * 폼이 구조화돼 있어도 자유 서술 칸에는 무엇이든 들어올 수 있으므로,
 * 저장 전에 기계적으로 걸러내고 걸린 제보는 본문을 버린다.
 * 개정 개인정보보호법(2026-09-11 시행) 아래에서 1인 학생 운영자에게 개인정보는 순수 부채다.
 */

export type ReportKind = 'foreign_card' | 'foreign_phone_sms' | 'correction';
export type Outcome = 'works' | 'fails' | 'mixed';

export interface Report {
  /** GitHub 이슈 번호 */
  id: number;
  kind: ReportKind;
  service_id: string | null;
  outcome: Outcome | null;
  /** 카드·번호의 발급 국가. 국가만 받는다. */
  origin_country: string | null;
  card_brand: string | null;
  context: string | null;
  /** 제보자가 실제로 시도한 날 (YYYY-MM-DD) */
  tried_on: string | null;
  details: string | null;
  received_at: string;
  source: string;
  author: string;
  status: 'accepted' | 'needs-review' | 'rejected';
  /** status가 accepted가 아닐 때 그 이유 */
  note: string | null;
}

/* ------------------------------------------------------------------ 개인정보 */

/**
 * 저장하면 안 되는 것들.
 *
 * 넓게 잡는다. 애매한 제보를 사람이 한 번 더 보는 비용보다
 * 개인정보가 공개 레포에 커밋되는 사고의 비용이 비교할 수 없이 크다.
 */
const PERSONAL_PATTERNS: { id: string; re: RegExp }[] = [
  { id: 'email', re: /[\w.+-]+@[\w-]+\.[\w.]{2,}/ },
  // 카드번호처럼 보이는 것 — 구분자 포함 13자리 이상
  { id: 'card-number', re: /(?:\d[ -]?){13,19}/ },
  // 국제전화 형태
  { id: 'phone', re: /\+\d{1,3}[\s-]?\d[\d\s-]{6,}/ },
  // 한국 휴대폰
  { id: 'phone-kr', re: /01[016789][\s-]?\d{3,4}[\s-]?\d{4}/ },
  // 주민등록번호
  { id: 'rrn', re: /\d{6}[\s-]?[1-8]\d{6}/ },
  { id: 'account-url', re: /https?:\/\/\S*(?:passport|account|mypage)\S*\?\S+/i },
];

export interface ScreenResult {
  clean: boolean;
  hits: string[];
}

/** 자유 서술에 개인정보로 보이는 것이 있는지 */
export function screenForPersonalData(text: string | null | undefined): ScreenResult {
  if (!text) return { clean: true, hits: [] };
  const hits: string[] = [];
  for (const p of PERSONAL_PATTERNS) if (p.re.test(text)) hits.push(p.id);
  return { clean: hits.length === 0, hits };
}

/* -------------------------------------------------------------- 이슈 본문 파싱 */

/**
 * GitHub Issue Form 은 본문을 `### 라벨` + 값 형태로 렌더링한다.
 * 라벨 전문을 비교하면 문구를 조금만 손봐도 파서가 조용히 깨지므로,
 * 안정적인 영어 조각으로만 찾는다.
 */
const FIELD_MATCHERS: { field: string; needle: string }[] = [
  { field: 'service', needle: 'which service' },
  { field: 'outcome', needle: 'what happened' },
  { field: 'origin_country', needle: 'country that issued' },
  { field: 'origin_country', needle: 'country of the phone' },
  { field: 'card_brand', needle: 'card brand' },
  { field: 'context', needle: 'what were you doing' },
  { field: 'tried_on', needle: 'when did you try' },
  { field: 'tried_on', needle: 'when did you see' },
  { field: 'details', needle: 'anything else' },
  { field: 'page', needle: 'which page' },
  { field: 'signal', needle: 'which value' },
  { field: 'observed', needle: 'what did you actually see' },
];

export function parseIssueForm(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  // 첫 조각은 헤딩 앞의 서문이라 버린다
  const blocks = body.split(/^###\s+/m).slice(1);
  for (const block of blocks) {
    const cut = block.indexOf('\n');
    if (cut === -1) continue;
    const label = block.slice(0, cut).trim().toLowerCase();
    const value = block.slice(cut + 1).trim();
    if (!value || value === '_No response_') continue;
    const match = FIELD_MATCHERS.find((m) => label.includes(m.needle));
    if (match && out[match.field] === undefined) out[match.field] = value;
  }
  return out;
}

/** 드롭다운 문구를 값으로. 폼의 선택지 문구가 바뀌면 여기도 같이 봐야 한다. */
export function readOutcome(raw: string | undefined): Outcome | null {
  if (!raw) return null;
  const s = raw.toLowerCase();

  // 순서가 중요하다. "No text arrived" 안에 "text arrived" 가 들어 있어서
  // 긍정을 먼저 보면 실패 제보를 성공으로 뒤집는다.
  if (s.includes('partly') || s.includes('only sometimes') || s.includes('some cases')) {
    return 'mixed';
  }
  if (
    s.includes('no text arrived') ||
    s.includes('would not even accept') ||
    s.includes('it failed') ||
    s.includes('rejected')
  ) {
    return 'fails';
  }
  if (s.includes('it worked') || s.includes('text arrived') || s.includes('went through')) {
    return 'works';
  }
  return null;
}

export function readDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const m = /(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (!m) return null;
  const iso = `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  // 미래 날짜는 오타이거나 장난이다. 값으로 쓰지 않는다.
  if (d.getTime() > Date.now() + 86_400_000) return null;
  return iso;
}

/** URL이나 이름에서 서비스 id 후보를 뽑는다 */
export function readServiceId(raw: string | undefined, known: string[]): string | null {
  if (!raw) return null;
  const text = raw.trim().toLowerCase();
  const fromUrl = /\/service\/([a-z0-9-]+)/.exec(text)?.[1];
  if (fromUrl && known.includes(fromUrl)) return fromUrl;
  const slug = text.replace(/[^a-z0-9-]/g, '');
  if (known.includes(slug)) return slug;
  return null;
}

/* ---------------------------------------------------------------- 집계 */

export interface Aggregate {
  value: Outcome | 'unknown';
  confidence: 'community' | 'conflicting' | 'unknown';
  evidence: Record<string, unknown>;
}

/**
 * 같은 (서비스 × 시그널)에 모인 제보들을 값 하나로.
 *
 * 엇갈리면 한쪽을 고르지 않고 `conflicting` 으로 남긴다 — 은폐하지 않는 것이
 * 이 제품의 성격이고, 실제로 해외 카드는 카드사·발급국·시점에 따라 갈리는 게 정상이다.
 */
export function aggregate(reports: Report[]): Aggregate {
  const usable = reports.filter((r) => r.status === 'accepted' && r.outcome !== null);
  if (usable.length === 0) {
    return {
      value: 'unknown',
      confidence: 'unknown',
      evidence: { reports: 0, note: '아직 채택된 제보가 없다' },
    };
  }

  const counts: Record<Outcome, number> = { works: 0, fails: 0, mixed: 0 };
  for (const r of usable) counts[r.outcome as Outcome] += 1;

  const distinct = (['works', 'fails'] as const).filter((k) => counts[k] > 0);
  const conflicting = distinct.length > 1;
  const value: Outcome = conflicting || counts.mixed > 0 ? 'mixed' : (distinct[0] ?? 'mixed');

  const sorted = [...usable].sort((a, b) => (a.tried_on ?? '').localeCompare(b.tried_on ?? ''));
  return {
    value,
    confidence: conflicting ? 'conflicting' : 'community',
    evidence: {
      reports: usable.length,
      outcomes: counts,
      countries: [...new Set(usable.map((r) => r.origin_country).filter(Boolean))],
      brands: [...new Set(usable.map((r) => r.card_brand).filter(Boolean))],
      first_tried_on: sorted[0]?.tried_on ?? null,
      last_tried_on: sorted.at(-1)?.tried_on ?? null,
      sources: usable.map((r) => r.source),
      note: conflicting
        ? '제보가 엇갈린다. 한쪽을 고르지 않고 엇갈린다는 사실을 그대로 둔다 — 발급국·카드사·시점에 따라 결과가 갈리는 것은 실제로 흔하다.'
        : '직접 겪은 사람들의 제보를 모은 값이다. 자동 재현은 불가능하다.',
    },
  };
}
