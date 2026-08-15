import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '..');

export const PATHS = {
  root: ROOT,
  schema: path.join(ROOT, 'schema', 'service.schema.json'),
  services: path.join(ROOT, 'data', 'services'),
  seeds: path.join(ROOT, 'data', 'seeds', 'services.seed.json'),
  signatures: path.join(ROOT, 'data', 'signatures'),
  changes: path.join(ROOT, 'data', 'changes'),
  runs: path.join(ROOT, 'data', 'runs'),
};

/**
 * 크롤링 예의(CLAUDE.md 절대규칙 4). 공개 URL과 연락처를 User-Agent에 반드시 남긴다.
 * 도메인이 정해지면 WIK_PROJECT_URL / WIK_CONTACT 를 Actions 변수로 설정할 것.
 */
export const PROJECT_URL = process.env.WIK_PROJECT_URL ?? 'https://github.com/nmcder/works-in-korea';
export const CONTACT = process.env.WIK_CONTACT ?? 'https://github.com/nmcder/works-in-korea/issues';
export const BOT_TOKEN = 'WorksInKoreaBot';
export const USER_AGENT = `${BOT_TOKEN}/0.1 (+${PROJECT_URL}; contact: ${CONTACT})`;

/**
 * 브라우저 프로브가 쓰는 UA. 실제 방문자와 같은 렌더링을 받아야 하므로 Chrome UA를 쓰되,
 * 봇임을 숨기지 않도록 뒤에 프로젝트 식별자를 덧붙인다.
 */
export const BROWSER_USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) ' +
  `Chrome/131.0.0.0 Safari/537.36 ${BOT_TOKEN}/0.1 (+${PROJECT_URL})`;

export const LIMITS = {
  /** 전체 동시 요청 수 */
  globalConcurrency: num('WIK_CONCURRENCY', 6),
  /** 같은 호스트에 대한 최소 요청 간격 (ms). robots.txt의 Crawl-delay가 더 크면 그쪽을 따른다. */
  perHostDelayMs: num('WIK_HOST_DELAY_MS', 2000),
  /** 단일 HTTP 요청 타임아웃 */
  requestTimeoutMs: num('WIK_TIMEOUT_MS', 20000),
  /** 브라우저 페이지 로드 타임아웃 */
  pageTimeoutMs: num('WIK_PAGE_TIMEOUT_MS', 30000),
  /** 동시에 열어 두는 브라우저 페이지 수 */
  browserConcurrency: num('WIK_BROWSER_CONCURRENCY', 3),
  /** 네트워크 오류/5xx 재시도 횟수 */
  retries: num('WIK_RETRIES', 1),
  /** 본문을 읽어들일 최대 바이트 */
  maxBodyBytes: num('WIK_MAX_BODY_BYTES', 3_000_000),
};

/**
 * 호스트별 간격 예외.
 *
 * 기본 2초는 개별 서비스 웹서버를 배려한 값이다. 아래 호스트는 모든 서비스의 앱 조회가
 * 한 호스트로 몰리는 구조라(107개 × 국가 수) 기본값을 쓰면 실행이 몇 시간 단위로 늘어난다.
 * 대규모 조회를 전제로 운영되는 인프라이므로 간격을 줄이되, 무제한으로 두지는 않는다.
 * 이 목록도 /method 페이지에 그대로 공개한다.
 */
export const HOST_DELAY_OVERRIDES: Record<string, number> = {
  'itunes.apple.com': 300,
  'play.google.com': 400,
};

/**
 * robots.txt 적용 예외.
 * 문서화된 공개 API 엔드포인트만 넣는다. 일반 웹페이지는 절대 넣지 말 것.
 * (robots.txt는 크롤러 대상 규약이고, 공개 API는 별도 이용 계약이다.
 *  이 목록은 /method 페이지에 그대로 공개한다.)
 */
export const ROBOTS_EXEMPT_PREFIXES = [
  'https://itunes.apple.com/lookup', // iTunes Search API — Apple이 공개한 조회용 엔드포인트
];

/**
 * support_en 분류에 쓰는 LLM. 키가 없으면 휴리스틱만 쓰고 unknown으로 남긴다.
 *
 * 비용 통제: 고객지원 페이지는 거의 바뀌지 않으므로 매일 전부 다시 분류하지 않는다.
 * 페이지 본문 해시가 지난번과 같으면 LLM을 호출하지 않고 이전 판정을 유지한다
 * (measured_at 은 갱신되므로 신선도 정보는 유지된다).
 * WIK_LLM_FORCE=1 로 강제 재분류할 수 있다.
 */
export const LLM = {
  apiKey: process.env.ANTHROPIC_API_KEY ?? null,
  model: process.env.WIK_LLM_MODEL ?? 'claude-sonnet-5',
  enabled: Boolean(process.env.ANTHROPIC_API_KEY),
  /** 내용이 그대로여도 다시 분류할지 */
  force: process.env.WIK_LLM_FORCE === '1',
  /** LLM에 보낼 최대 글자 수. 늘리면 정확도가 조금 오르고 비용이 비례해서 오른다. */
  maxInputChars: num('WIK_LLM_MAX_CHARS', 8000),
};

/** app_availability 조회 대상 국가 (kr는 기준선) */
export const APP_STORE_COUNTRIES = [
  'kr',
  'us',
  'jp',
  'gb',
  'de',
  'fr',
  'sg',
  'tw',
  'hk',
  'au',
  'ca',
  'th',
  'vn',
  'ph',
];

function num(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
