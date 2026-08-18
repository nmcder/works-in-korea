/**
 * 프로브 1 — overseas_access: 해외 IP에서 접속되나?
 *
 * 측정 지점(vantage point)은 GitHub Actions 러너다. 러너가 해외(주로 미국)에 있다는 점이
 * 곧 "외국인 방문자의 시점"이므로 별도 프록시 없이도 1개 지점은 정직하게 측정된다.
 * 다지역(미·일·유럽) 확장은 vantage_points 배열에 항목을 추가하는 형태로 열려 있다.
 */
import { politeFetch } from '../lib/http.js';
import type { OverseasAccessValue, ProbeResult, Service, Signal } from '../types.js';

/**
 * 지역(국가) 차단임을 명시하는 문구. 이게 잡혀야만 blocked로 단정한다.
 */
const GEO_BLOCK_MARKERS = [
  'not available in your country',
  'not available in your region',
  'not available in your location',
  'this service is only available in korea',
  'available only in korea',
  'restricted to users in korea',
  '해외에서는 이용',
  '해외에서 이용',
  '해외 ip',
  '해외아이피',
  '국내에서만 이용',
  '국내에서만 접속',
  '대한민국에서만',
  '한국에서만 이용',
];

/**
 * 차단은 맞는데 사유가 지역인지 봇 탐지인지 구분할 수 없는 문구.
 *
 * 이 구분이 이 프로브의 핵심이다. 쿠팡처럼 봇 UA를 403으로 막는 사이트를
 * "해외에서 차단됨"으로 발표하면 사실이 아니고, 기업 항의의 정당한 빌미가 된다.
 * 구분이 안 되면 blocked가 아니라 unknown이 정답이다. (CLAUDE.md 절대규칙 5, 6)
 */
const AMBIGUOUS_DENY_MARKERS = [
  'access denied',
  'access to this page has been denied',
  'sorry, you have been blocked',
  'error 1020',
  'error code: 1020',
  'attention required',
  'are you a robot',
  'unusual traffic',
  'automated requests',
  '접속이 차단',
  '비정상적인 접근',
  '비정상적인 요청',
  '자동화된 접근',
];

export interface VantagePoint {
  id: string;
  country: string | null;
  region: string | null;
  ip_asn: string | null;
}

/** 이번 실행이 어디에서 나가는지 1회만 조회한다. 실패해도 측정은 계속하고 unknown으로 남긴다. */
export async function resolveVantagePoint(): Promise<VantagePoint> {
  const endpoints = ['https://ipapi.co/json/', 'https://ifconfig.co/json'];
  for (const endpoint of endpoints) {
    const res = await politeFetch(endpoint, { skipRobots: true, timeoutMs: 8000 });
    if (!res.ok || !res.body) continue;
    try {
      const data = JSON.parse(res.body) as Record<string, unknown>;
      const country = str(data['country_code'] ?? data['country'] ?? data['country_iso']);
      const region = str(data['region'] ?? data['region_name'] ?? data['city']);
      const asn = str(data['asn'] ?? data['asn_org'] ?? data['org']);
      if (country) {
        return { id: 'github-actions', country: country.toLowerCase(), region, ip_asn: asn };
      }
    } catch {
      /* 다음 엔드포인트로 */
    }
  }
  return { id: 'github-actions', country: null, region: null, ip_asn: null };
}

/**
 * 측정 지점을 사람이 읽는 한 낱말로. by_vantage 의 열쇠가 된다.
 * 지역까지 포함하는 이유는 미국 안에서만 옮겨 다녀도 결과가 갈리기 때문이다 —
 * 2026-08-15 에 정부·은행 9곳이 Washington 에서는 열리고 Illinois 에서는 안 열렸다.
 */
export function vantageKey(v: VantagePoint): string {
  return [v.country, v.region].filter(Boolean).join('·') || v.id;
}

type ByVantage = Record<
  string,
  {
    value: OverseasAccessValue;
    at: string;
    note: string | null;
    /**
     * 이 지점에서 **서버가 아예 응답하지 않았다**는 표시.
     * 한 번은 우연일 수 있으므로 값으로 삼지 않고, 같은 지점에서 두 번 연속일 때만
     * blocked 로 적는다. 그 판단을 하려면 지난번에도 그랬는지를 알아야 한다.
     */
    no_answer?: true;
  }
>;

/** 이전 측정에 쌓인 지점별 기록을 꺼낸다 */
export function readByVantage(previous: Signal<OverseasAccessValue> | undefined): ByVantage {
  const raw = (previous?.evidence as { by_vantage?: unknown } | null | undefined)?.by_vantage;
  return raw && typeof raw === 'object' ? ({ ...raw } as ByVantage) : {};
}

export async function probeOverseasAccess(
  service: Service,
  vantage: VantagePoint,
  now: string,
  previous?: Signal<OverseasAccessValue>,
): Promise<ProbeResult<OverseasAccessValue>> {
  const res = await politeFetch(service.url);
  const key = vantageKey(vantage);
  const byVantage = readByVantage(previous);

  /**
   * 이 시그널은 서비스만의 속성이 아니라 (서비스 × 측정 지점)의 속성이다.
   * 값 하나만 저장하고 그것을 "정답"이라고 부르면, 러너가 다른 지역에 뜬 날마다
   * 서비스가 바뀐 것처럼 보인다. 지점별로 마지막 결과를 남겨 두면
   * "캘리포니아에서는 열리고 일리노이에서는 안 열린다"가 그 자체로 사실이 된다.
   */
  const record = (
    value: OverseasAccessValue,
    note: string | null,
    noAnswer?: true,
  ): ByVantage => ({
    ...byVantage,
    [key]: { value, at: now, note, ...(noAnswer ? { no_answer: true } : {}) },
  });

  /** 지난번에도 같은 지점에서 응답이 없었나 */
  const failedHereBefore = byVantage[key]?.no_answer === true;

  const point: Record<string, unknown> = {
    id: vantage.id,
    country: vantage.country,
    http_status: res.status,
    final_url: res.finalUrl,
    redirected: res.redirected,
    elapsed_ms: res.elapsedMs,
    body_sha256: res.bodySha256,
    content_type: res.headers['content-type'] ?? null,
  };

  /*
   * ── "우리가 안 본 것" 과 "그쪽이 대답을 안 한 것" 은 다르다
   *
   * 2026-08-17 까지 이 둘이 같은 unknown 으로 뭉개져 있었다. 그런데 이 시그널이
   * 재는 것이 바로 **해외에서 응답하느냐** 이므로, 뒤쪽은 못 잰 것이 아니라 잰 것이다.
   *
   * 그렇게 뭉개진 12곳의 정체가 정부24·홈택스·하이코리아·국세청·우체국·고속버스·
   * 시외버스·국립극장·티머니·KT·우리은행이었다. 외국인이 가장 아쉬워할 자리이고,
   * 열 곳이 연결 자체가 안 되는 경우였다.
   *
   * 한 번의 타임아웃은 우연일 수 있으므로 값으로 삼지 않는다. **같은 지점에서 두 번
   * 연속** 응답이 없을 때만 blocked 로 적는다. 그래야 /changes 에 가짜 변경이 안 쌓인다.
   *
   * 데이터센터 IP 라서 국가 차단인지 데이터센터 차단인지는 여전히 못 가른다 (D-14).
   * 그건 blocked 의 뜻에 이미 포함돼 있고 화면과 범례에 적혀 있다.
   */
  const failure = res.blockedReason ?? res.error;
  const noAnswer =
    failure !== null &&
    /UND_ERR_CONNECT_TIMEOUT|ETIMEDOUT|ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN|SocketError|ConnectTimeout/i.test(
      failure,
    );

  if (noAnswer) {
    point['not_measured'] = failure;
    point['no_answer'] = true;
    if (failedHereBefore) {
      const note = `${key} 에서 서버가 응답하지 않는다 (${failure}). 같은 지점에서 두 번 연속 확인됨. 우리 측정 지점은 데이터센터 IP라 국가 차단인지 데이터센터 차단인지는 가르지 못한다.`;
      return {
        value: 'blocked',
        confidence: 'auto',
        evidence: { vantage_points: [point], note, by_vantage: record('blocked', note, true) },
      };
    }
    const note = `${key} 에서 서버가 응답하지 않았다 (${failure}). 한 번은 우연일 수 있어 값으로 삼지 않는다 — 다음 측정에서 같은 지점에 또 그러면 blocked 로 적는다.`;
    return {
      value: 'unknown',
      confidence: 'unknown',
      evidence: { vantage_points: [point], note, by_vantage: record('unknown', note, true) },
    };
  }

  if (res.blockedReason) {
    point['not_measured'] = res.blockedReason;
    /*
     * robots.txt 를 받아 왔는데 그것이 열지 말라고 한 경우다. 즉 **서버는 이 지점에
     * 응답했다.** 비어 있는 이유가 그쪽의 차단이 아니라 우리 결정이라는 것을 적어 둔다.
     * 그래도 ok 라고는 못 한다 — 첫 페이지가 지역 차단을 걸어 두는 경우가 따로 있다.
     */
    const served = /Disallow/i.test(res.blockedReason);
    const note = served
      ? `${res.blockedReason} — robots.txt 는 이 지점에서 정상으로 받아 왔으므로 서버 자체는 해외에 응답한다. 페이지를 열지 않은 것은 우리 결정이다.`
      : res.blockedReason;
    return {
      value: 'unknown',
      confidence: 'unknown',
      evidence: { vantage_points: [point], note, by_vantage: record('unknown', note) },
    };
  }

  if (res.error !== null) {
    point['error'] = res.error;
    /*
     * 연결은 됐는데 그 뒤가 실패한 경우다 (인증서 검증 실패 등). 서버는 응답했으므로
     * 응답 없음과 다르고, 페이지를 못 읽었으므로 ok 와도 다르다. 사유를 그대로 적는다.
     */
    const tls = /CERT|SELF_SIGNED|UNABLE_TO_VERIFY|SSL|TLS/i.test(res.error);
    const note = tls
      ? `서버는 응답하지만 인증서를 검증할 수 없다 (${res.error}). 브라우저에서는 경고 화면이 먼저 뜬다.`
      : `요청 실패 — 차단 여부 판정 불가 (${res.error})`;
    return {
      value: 'unknown',
      confidence: 'unknown',
      evidence: { vantage_points: [point], note, by_vantage: record('unknown', note) },
    };
  }

  const status = res.status ?? 0;
  const bodyLower = (res.body ?? '').toLowerCase().slice(0, 200_000);
  const geoMarkers = GEO_BLOCK_MARKERS.filter((m) => bodyLower.includes(m));
  const ambiguousMarkers = AMBIGUOUS_DENY_MARKERS.filter((m) => bodyLower.includes(m));
  point['geo_block_markers'] = geoMarkers;
  point['ambiguous_deny_markers'] = ambiguousMarkers;

  let value: OverseasAccessValue;
  let note: string | null = null;

  if (geoMarkers.length > 0) {
    // 지역 제한을 명시한 경우에만 blocked로 단정한다.
    value = 'blocked';
    note = '본문이 지역(국가) 제한을 명시함';
  } else if (status === 451) {
    value = 'blocked';
    note = 'HTTP 451 (법적 사유로 이용 불가)';
  } else if (status === 403 || status === 429 || ambiguousMarkers.length > 0) {
    // 봇 차단과 지역 차단을 구분할 수 없다. 추측하지 않는다.
    value = 'unknown';
    note =
      '요청이 거부됐으나 사유가 지역 차단인지 봇 차단(UA/데이터센터 IP)인지 구분할 수 없다. ' +
      '해외 차단으로 단정하지 않는다 — 실제 브라우저 접속 결과 제보로 확정할 항목이다.';
  } else if (status >= 200 && status < 400) {
    value = 'ok';
  } else if (status >= 500) {
    value = 'degraded';
    note = '서버 오류 응답 — 일시적 장애일 수 있다';
  } else {
    value = 'unknown';
    note = `판정 불가한 상태코드 ${status}`;
  }

  return {
    value,
    confidence: value === 'unknown' ? 'unknown' : 'auto',
    evidence: { vantage_points: [point], note, by_vantage: record(value, note) },
  };
}

/** 다른 프로브가 "이 응답을 근거로 써도 되는가"를 판단할 때 쓰는 공통 기준 */
export function isUsableResponse(status: number | null): boolean {
  return status !== null && status >= 200 && status < 400;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null;
}
