/**
 * 프로브 6 — support_en: 영문 고객지원 채널이 있나?
 *
 * 2단계로 동작한다.
 *  1) 고객센터/문의 페이지를 찾아 텍스트를 뽑는다 (여기까지는 항상 수행)
 *  2) ANTHROPIC_API_KEY 가 있으면 LLM으로 분류, 없으면 보수적 휴리스틱만 적용
 *
 * 키가 없을 때 휴리스틱은 강한 근거가 있을 때만 yes/no를 내고 나머지는 unknown으로 둔다.
 * "모르면 모름"이 이 제품의 자산이므로 추측으로 채우지 않는다.
 */
import Anthropic from '@anthropic-ai/sdk';
import { LLM } from '../config.js';
import { extractLinks, politeFetch, sha256, visibleText } from '../lib/http.js';
import { errMessage, log } from '../lib/log.js';
import type { ProbeResult, Service, Signal, SupportEnValue } from '../types.js';

const SUPPORT_LINK_HINTS = [
  'help',
  'support',
  'contact',
  'customer',
  'inquiry',
  'faq',
  'cs',
  '고객센터',
  '고객지원',
  '문의',
  '상담',
  '자주 묻는',
];

/** 영문 지원의 강한 신호 */
const STRONG_EN_MARKERS = [
  'english support',
  'english inquiry',
  'customer service in english',
  'contact us in english',
  'english customer center',
  'global customer center',
  'foreign language support',
  'english help center',
];

let client: Anthropic | null = null;

function llm(): Anthropic {
  client ??= new Anthropic();
  return client;
}

/**
 * 이번 실행에서 실제로 쓴 LLM 사용량.
 *
 * 돈이 나가는 유일한 곳이라 추정하지 않고 API가 돌려준 실제 토큰 수를 센다.
 * cached 는 페이지 내용이 그대로여서 호출을 건너뛴 횟수다 — 이게 calls 보다
 * 훨씬 커야 정상이고, 뒤집히면 캐시가 깨진 것이다.
 */
export const llmUsage = {
  calls: 0,
  cached: 0,
  inputTokens: 0,
  outputTokens: 0,
  /**
   * 호출이 실패해 휴리스틱으로 떨어진 횟수.
   *
   * ⚠️ 이걸 세지 않아서 사고가 하루 묻혔다. 2026-08-15 실행에서 모델 이름이 빈 채로
   * 나가 70건이 전부 400 으로 튕겼는데, 프로브가 얌전히 휴리스틱으로 대체하는 바람에
   * 실행 요약은 "오류 0건"이었다. 실패를 삼키는 것은 옳지만 **말없이** 삼키면 안 된다.
   */
  failures: 0,
  lastError: null as string | null,
};

export function resetLlmUsage(): void {
  llmUsage.calls = 0;
  llmUsage.cached = 0;
  llmUsage.inputTokens = 0;
  llmUsage.outputTokens = 0;
  llmUsage.failures = 0;
  llmUsage.lastError = null;
}

export async function probeSupportEn(
  service: Service,
  previous?: Signal<SupportEnValue>,
): Promise<ProbeResult<SupportEnValue>> {
  const pages = await collectSupportPages(service);

  if (pages.length === 0) {
    return {
      value: 'unknown',
      confidence: 'unknown',
      evidence: {
        not_measured: '고객지원 페이지를 찾지 못함',
        hint: 'hints.support_url 을 채우면 측정 가능해진다',
      },
    };
  }

  const combined = pages
    .map((p) => `# ${p.url}\n${p.text}`)
    .join('\n\n')
    .slice(0, LLM.maxInputChars);
  const contentHash = sha256(normalizeForHash(combined));
  const heuristic = classifyHeuristic(combined);
  const pageMeta = pages.map((p) => ({ url: p.url, status: p.status, chars: p.text.length }));

  // 내용이 지난번과 같으면 다시 물어보지 않는다. 이게 이 프로브의 유일한 비용 통제 장치다.
  const prevHash = (previous?.evidence as { content_sha256?: string } | null | undefined)?.content_sha256;
  const prevUsedLlm = typeof (previous?.evidence as { llm?: unknown } | null | undefined)?.llm === 'object';
  if (!LLM.force && prevUsedLlm && prevHash === contentHash && previous?.value !== undefined) {
    llmUsage.cached += 1;
    return {
      value: previous.value,
      confidence: previous.confidence === 'unknown' ? 'unknown' : 'auto',
      evidence: {
        ...(previous.evidence ?? {}),
        pages: pageMeta,
        content_sha256: contentHash,
        reused: '고객지원 페이지 내용이 지난 측정과 동일해 재분류하지 않음 (LLM 호출 생략)',
      },
    };
  }

  if (!LLM.enabled) {
    return {
      value: heuristic.value,
      confidence: heuristic.value === 'unknown' ? 'unknown' : 'auto',
      evidence: {
        pages: pageMeta,
        content_sha256: contentHash,
        method_detail: 'heuristic-only (ANTHROPIC_API_KEY 미설정)',
        heuristic,
      },
    };
  }

  try {
    const verdict = await classifyWithLlm(service, combined);
    return {
      value: verdict.value,
      confidence: verdict.value === 'unknown' ? 'unknown' : 'auto',
      evidence: {
        pages: pageMeta,
        content_sha256: contentHash,
        method_detail: `llm:${LLM.model}`,
        llm: verdict,
        heuristic,
      },
    };
  } catch (e) {
    llmUsage.failures += 1;
    llmUsage.lastError = errMessage(e).slice(0, 300);
    log.warn(`[${service.id}] support_en LLM 분류 실패, 휴리스틱으로 대체: ${errMessage(e)}`);
    return {
      value: heuristic.value,
      confidence: heuristic.value === 'unknown' ? 'unknown' : 'auto',
      evidence: {
        pages: pageMeta,
        content_sha256: contentHash,
        method_detail: 'heuristic-fallback (LLM 호출 실패)',
        llm_error: errMessage(e),
        heuristic,
      },
    };
  }
}

async function collectSupportPages(
  service: Service,
): Promise<{ url: string; status: number | null; text: string }[]> {
  const out: { url: string; status: number | null; text: string }[] = [];

  const hinted = service.hints?.support_url;
  if (hinted) {
    const res = await politeFetch(hinted, { headers: { 'accept-language': 'en-US,en;q=0.9' } });
    if (res.ok && res.body) out.push({ url: hinted, status: res.status, text: visibleText(res.body) });
  }

  const home = await politeFetch(service.url, {
    headers: { 'accept-language': 'en-US,en;q=0.9' },
  });
  if (!home.ok || !home.body) return out;

  // 홈페이지 텍스트 자체도 근거에 넣는다 (푸터에 English 안내가 있는 경우가 흔함)
  out.push({ url: service.url, status: home.status, text: visibleText(home.body, 8000) });

  if (out.length >= 3) return out;

  const links = extractLinks(home.body, home.finalUrl ?? service.url);
  const candidates = links
    .filter((l) => {
      const hay = `${l.href} ${l.text}`.toLowerCase();
      return SUPPORT_LINK_HINTS.some((h) => hay.includes(h));
    })
    .map((l) => l.href);

  const unique = [...new Set(candidates)]
    .filter((u) => sameSite(u, service.url))
    .slice(0, 2);

  for (const url of unique) {
    const res = await politeFetch(url, { headers: { 'accept-language': 'en-US,en;q=0.9' } });
    if (res.ok && res.body) out.push({ url, status: res.status, text: visibleText(res.body, 10000) });
  }
  return out;
}

function sameSite(url: string, base: string): boolean {
  try {
    const a = new URL(url).hostname.split('.').slice(-2).join('.');
    const b = new URL(base).hostname.split('.').slice(-2).join('.');
    return a === b;
  } catch {
    return false;
  }
}

interface HeuristicVerdict {
  value: SupportEnValue;
  strong_markers: string[];
  latin_ratio: number;
  reason: string;
}

function classifyHeuristic(text: string): HeuristicVerdict {
  const lower = text.toLowerCase();
  const strong = STRONG_EN_MARKERS.filter((m) => lower.includes(m));
  const latin = (text.match(/[A-Za-z]/g)?.length ?? 0) / Math.max(1, text.length);

  if (strong.length > 0) {
    return {
      value: 'yes',
      strong_markers: strong,
      latin_ratio: round(latin),
      reason: '영문 지원을 명시하는 문구를 찾음',
    };
  }
  return {
    value: 'unknown',
    strong_markers: [],
    latin_ratio: round(latin),
    reason: '명시적 문구 없음 — 휴리스틱만으로는 판정하지 않는다',
  };
}

interface LlmVerdict {
  value: SupportEnValue;
  quoted_evidence: string | null;
  reason: string;
}

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    value: {
      type: 'string',
      enum: ['yes', 'no', 'unknown'],
      description:
        'yes = 영어로 문의할 수 있는 지원 채널(영문 상담 이메일/폼/전화/채팅)이 페이지에 명시됨. no = 지원 채널은 있으나 한국어 전용임이 명확함. unknown = 판단할 근거가 부족함.',
    },
    quoted_evidence: {
      type: ['string', 'null'],
      description: '판정 근거가 된 원문 인용 (최대 200자). 근거가 없으면 null.',
    },
    reason: { type: 'string', description: '한 문장 판정 사유 (한국어)' },
  },
  required: ['value', 'quoted_evidence', 'reason'],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `당신은 한국 온라인 서비스의 고객지원 페이지 텍스트를 읽고, 외국인이 영어로 문의할 수 있는 채널이 있는지 분류합니다.

판정 기준:
- yes: 영문 상담 창구가 페이지에 명시되어 있다 (영문 문의 폼, English 안내 이메일/전화, 영어 채팅, global/english 고객센터 등).
- no: 고객지원 채널은 확인되지만 한국어 전용임이 명확하다.
- unknown: 페이지에 지원 채널 정보가 없거나, 영어 여부를 판단할 근거가 부족하다.

규칙:
- 페이지가 영어로 쓰여 있다는 것만으로 yes로 판정하지 마세요. 실제 상담 창구가 영어를 받는지가 기준입니다.
- 근거가 애매하면 반드시 unknown을 선택하세요. 추측으로 yes/no를 채우면 안 됩니다.
- quoted_evidence 에는 판정 근거가 된 원문을 그대로 인용하세요.`;

async function classifyWithLlm(service: Service, text: string): Promise<LlmVerdict> {
  const response = await llm().messages.create({
    model: LLM.model,
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    output_config: {
      effort: 'low',
      format: { type: 'json_schema', schema: VERDICT_SCHEMA },
    },
    messages: [
      {
        role: 'user',
        content: `서비스: ${service.name.ko} (${service.name.en}) — ${service.url}\n\n다음은 이 서비스의 고객지원 관련 페이지에서 추출한 텍스트입니다.\n\n---\n${text}\n---`,
      },
    ],
  });

  llmUsage.calls += 1;
  llmUsage.inputTokens += response.usage?.input_tokens ?? 0;
  llmUsage.outputTokens += response.usage?.output_tokens ?? 0;

  if (response.stop_reason === 'refusal') {
    throw new Error(`모델이 요청을 거부함 (category=${response.stop_details?.category ?? 'null'})`);
  }

  const block = response.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error('LLM 응답에 text 블록이 없음');

  const parsed = JSON.parse(block.text) as LlmVerdict;
  if (!['yes', 'no', 'unknown'].includes(parsed.value)) {
    throw new Error(`예상 밖의 value: ${String(parsed.value)}`);
  }
  return parsed;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * 재분류 여부를 판단하기 위한 해시 정규화.
 *
 * 고객센터 페이지에는 날짜·조회수·배너 순번처럼 매일 바뀌지만 판정과 무관한 값이 섞여 있다.
 * 이걸 그대로 해시하면 매일 캐시가 깨져서 비용 통제 장치가 무력해진다.
 * 숫자와 공백만 정규화하고 문장은 건드리지 않는다 (판정 근거는 보존).
 */
function normalizeForHash(text: string): string {
  return text
    .replace(/\d+/g, '#')
    .replace(/\s+/g, ' ')
    .trim();
}
