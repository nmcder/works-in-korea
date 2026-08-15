/**
 * 프로브 4 — app_availability: 앱이 스토어에 등재되어 있나?
 *
 * ⚠️ 명세(docs/02-product-spec.md §4)는 "출시 국가 배열"을 요구하지만,
 *    2026-08-15 검증 결과 공개 엔드포인트로는 국가별 출시 여부를 확인할 수 없었다.
 *      - iTunes lookup의 country= 파라미터: 한국 전용으로 보이는 앱(정부24, KB스타뱅킹)도
 *        us/de/jp 스토어프론트에서 모두 resultCount=1 을 반환
 *      - apps.apple.com/{cc}/app/id{id}: 모든 국가에서 200 (없는 앱만 404)
 *      - play.google.com ...&gl={cc}: 모든 국가에서 200 (없는 패키지만 404)
 *    즉 세 경로 모두 "앱의 존재 여부"만 알려주고 "그 나라에서 받을 수 있는지"는 알려주지 않는다.
 *
 *    따라서 국가 배열을 추측으로 채우지 않고 countries: null 로 남기며,
 *    실제로 검증되는 "스토어 등재 여부"만 측정한다. (CLAUDE.md 절대규칙 5)
 *    국가별 측정 방법이 생기면 이 프로브만 교체하면 된다.
 */
import { politeFetch } from '../lib/http.js';
import type { AppAvailabilityValue, ProbeResult, Service } from '../types.js';

const METHOD_LIMITATION =
  '국가별 출시 여부는 측정하지 않는다. iTunes lookup(country=), apps.apple.com 스토어프론트 페이지, ' +
  'play.google.com(gl=) 세 경로 모두 앱의 존재 여부만 반영하고 배포 국가를 구분하지 않는 것을 ' +
  '2026-08-15에 확인했다 (한국 전용으로 보이는 앱도 모든 국가에서 동일 응답). ' +
  '추측으로 채우지 않고 countries=null 로 남긴다.';

export async function probeAppAvailability(
  service: Service,
): Promise<ProbeResult<AppAvailabilityValue>> {
  const iosId = service.hints?.ios_app_id ?? null;
  const androidPkg = service.hints?.android_package ?? null;

  if (!iosId && !androidPkg) {
    return {
      value: null,
      confidence: 'unknown',
      evidence: {
        not_measured: '앱 ID 미상',
        hint: 'data/seeds/services.seed.json 의 hints.ios_app_id / hints.android_package 를 채우면 측정된다',
        method_limitation: METHOD_LIMITATION,
      },
    };
  }

  const ios = iosId ? await checkIos(iosId) : null;
  const android = androidPkg ? await checkAndroid(androidPkg) : null;

  const measured = (ios !== null && ios.listed !== null) || (android !== null && android.listed !== null);

  return {
    value: measured
      ? {
          ios_listed: ios?.listed ?? null,
          android_listed: android?.listed ?? null,
          countries: null,
        }
      : null,
    confidence: measured ? 'auto' : 'unknown',
    evidence: {
      ios: ios ? { app_id: iosId, ...ios } : null,
      android: android ? { package: androidPkg, ...android } : null,
      method_limitation: METHOD_LIMITATION,
    },
  };
}

async function checkIos(
  appId: string,
): Promise<{ listed: boolean | null; endpoint: string; http_status: number | null; result_count: number | null; error: string | null }> {
  // 기준 스토어프론트는 kr 하나만 조회한다 (국가 구분이 안 되므로 14개국을 도는 의미가 없다)
  const endpoint = `https://itunes.apple.com/lookup?id=${encodeURIComponent(appId)}&country=kr`;
  const res = await politeFetch(endpoint, { timeoutMs: 12000 });
  if (res.blockedReason || res.error !== null || !res.body) {
    return {
      listed: null,
      endpoint,
      http_status: res.status,
      result_count: null,
      error: res.blockedReason ?? res.error ?? 'no-body',
    };
  }
  try {
    const data = JSON.parse(res.body) as { resultCount?: number };
    const count = data.resultCount ?? 0;
    return { listed: count > 0, endpoint, http_status: res.status, result_count: count, error: null };
  } catch {
    return { listed: null, endpoint, http_status: res.status, result_count: null, error: 'JSON 파싱 실패' };
  }
}

async function checkAndroid(
  pkg: string,
): Promise<{ listed: boolean | null; endpoint: string; http_status: number | null; error: string | null }> {
  const endpoint = `https://play.google.com/store/apps/details?id=${encodeURIComponent(pkg)}&hl=en`;
  const res = await politeFetch(endpoint, { discardBody: true, timeoutMs: 12000 });
  if (res.blockedReason) {
    return { listed: null, endpoint, http_status: null, error: res.blockedReason };
  }
  if (res.error !== null) {
    return { listed: null, endpoint, http_status: null, error: res.error };
  }
  const status = res.status ?? 0;
  if (status >= 200 && status < 300) return { listed: true, endpoint, http_status: status, error: null };
  if (status === 404) return { listed: false, endpoint, http_status: status, error: null };
  return { listed: null, endpoint, http_status: status, error: `예상 밖 상태코드 ${status}` };
}
