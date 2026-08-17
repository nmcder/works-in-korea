/**
 * 우리 데이터가 우리 데이터와 어긋나는 곳을 찾는다.
 *
 * ── 왜 만들었나
 *
 * 2026-08-17 하루에 같은 종류의 사고를 세 번 잡았는데, 셋 다 **우리가 이미 갖고
 * 있던 정보로 알 수 있는 것**이었다.
 *
 *   코레일       영어 고객지원 "있음" + 쓸 수 있는 언어 ["ko"]      13곳에서 같은 모양
 *   배민·농협    근거에 "영어 FAQ 가 전부 영어" + 언어는 빈칸
 *   야놀자       hints 에 안드로이드 패키지가 있는데 "스토어에 없음"
 *
 * 앞의 둘은 사람이 눈으로 훑다가 우연히 걸렸다. 야놀자는 이 검사를 처음 돌린
 * 순간 나왔다. 106곳 × 8시그널을 매번 눈으로 훑을 수는 없다.
 *
 * ── 무엇을 하지 않는가
 *
 * **빈칸을 채우라고 하지 않는다.** 이 프로젝트가 파는 것은 "모르면 모른다고 적는
 * 것"이라, 안 잰 항목을 재촉하는 검사를 만들면 그 압력이 결국 추측으로 채우게 만든다.
 * 여기서 잡는 것은 **두 값이 동시에 참일 수 없는 자리**뿐이다.
 *
 * ── 왜 대부분이 경고인가
 *
 * 이 검사는 크론이 매일 돌리는 `npm run validate` 안에서 돈다. 실패로 처리하면
 * 그날 측정 결과가 커밋되지 않고 통째로 날아간다. 의심스럽다는 이유로 하루치
 * 데이터를 버리는 것은 손해다.
 *
 *   error  두 값이 동시에 참일 수 없고, 고치는 데 추측이 필요 없다 (우리 장부의 오류)
 *   warn   한쪽이 다른 쪽을 의심하게 한다. 사람이 열어 봐야 안다
 */
import type { Service, Signal } from '../types.js';

export interface Finding {
  service_id: string;
  level: 'error' | 'warn';
  /** 규칙 이름. 같은 규칙끼리 묶어 보여주기 위한 것 */
  rule: string;
  /** 운영자가 읽을 한 줄. 코드를 모르는 사람이 읽는다 (CLAUDE.md 2장) */
  message: string;
}

/** i18n_ui 값에 이 언어가 들어 있나 */
function hasLang(signal: Signal | undefined, code: string): boolean {
  return Array.isArray(signal?.value) && (signal.value as string[]).includes(code);
}

/** 값이 실제로 잡혀 있나 (unknown·null 은 "아직 모름"이지 사실이 아니다) */
function known(signal: Signal | undefined): boolean {
  return (
    signal !== undefined &&
    signal.confidence !== 'unknown' &&
    signal.value !== null &&
    signal.value !== 'unknown'
  );
}

function sameRun(a: Signal | undefined, b: Signal | undefined): boolean {
  if (!a?.measured_at || !b?.measured_at) return false;
  const gap = Math.abs(Date.parse(a.measured_at) - Date.parse(b.measured_at));
  return Number.isFinite(gap) && gap < 6 * 60 * 60 * 1000;
}

/** method 와 confidence 는 같은 것을 말해야 한다. 화면에 나가는 것이 confidence 다. */
function methodMatchesConfidence(method: string, confidence: string): boolean {
  if (method === 'none') return confidence === 'unknown';
  if (method === 'manual') return confidence === 'manual';
  if (method === 'community') return confidence === 'community' || confidence === 'conflicting';
  if (method.startsWith('auto:')) return confidence === 'auto' || confidence === 'unknown';
  return false;
}

export function findContradictions(services: Service[]): Finding[] {
  const out: Finding[] = [];
  const add = (s: Service, level: Finding['level'], rule: string, message: string): void => {
    out.push({ service_id: s.id, level, rule, message });
  };

  for (const s of services) {
    const sig = s.signals;
    const hints = s.hints ?? {};
    const lang = sig.i18n_ui;
    const app = sig.app_availability;
    const appValue = app?.value ?? null;

    /* ── 장부 자체가 어긋난 것 ── */

    for (const [key, signal] of Object.entries(sig)) {
      if (!signal) continue;
      if (!methodMatchesConfidence(signal.method, signal.confidence)) {
        add(
          s,
          'error',
          'method-confidence',
          `${key}: 어떻게 쟀는지(${signal.method})와 화면에 나갈 신뢰도(${signal.confidence})가 서로 다른 것을 말한다`,
        );
      }
      if (signal.measured_at && signal.last_changed_at) {
        if (Date.parse(signal.last_changed_at) > Date.parse(signal.measured_at) + 1000) {
          add(
            s,
            'error',
            'time-order',
            `${key}: 마지막으로 바뀐 시각(${signal.last_changed_at})이 마지막으로 잰 시각(${signal.measured_at})보다 뒤다`,
          );
        }
      }
    }

    if (hints.no_app === true && appValue && (appValue.ios_listed === true || appValue.android_listed === true)) {
      add(
        s,
        'error',
        'no-app-but-listed',
        '앱이 없다고 적어 뒀는데(hints.no_app) 스토어에 등재돼 있다고 나온다. 둘 중 하나는 틀렸다',
      );
    }

    /* ── 한쪽이 다른 쪽을 의심하게 하는 것 ── */

    /*
     * 코레일 자리. 영어로 문의할 수 있다고 해 놓고 쓸 수 있는 언어에는 영어가 없다.
     * 영어 FAQ 만 있고 화면은 한국어뿐인 곳이 실제로 있으므로 실패로 만들지 않는다.
     * 다만 2026-08-17 에 이 모양으로 13곳이 한꺼번에 틀려 있었다.
     */
    if (sig.support_en?.value === 'yes' && known(lang) && !hasLang(lang, 'en')) {
      add(
        s,
        'warn',
        'support-en-vs-lang',
        `영어로 문의할 수 있다고 돼 있는데 쓸 수 있는 언어는 ${JSON.stringify(lang?.value)} 다. 영어 화면을 못 본 것인지 확인할 것`,
      );
    }

    /*
     * 배민·농협 자리. 영어 고객지원 근거에 "영문 사이트가 열린다"고 적어 놓고
     * 같은 서비스의 언어는 비워 뒀다. 이미 본 것을 안 적은 것이다.
     */
    if (sig.support_en?.value === 'yes' && !known(lang)) {
      add(
        s,
        'warn',
        'support-en-lang-blank',
        '영어로 문의할 수 있다고 확인해 놓고 쓸 수 있는 언어는 비어 있다. 그때 본 화면이 영어였다면 언어에도 적을 것',
      );
    }

    if (hints.english_url && !hasLang(lang, 'en')) {
      add(
        s,
        'warn',
        'english-url-vs-lang',
        `영문 주소(${hints.english_url})를 적어 뒀는데 쓸 수 있는 언어에 영어가 없다`,
      );
    }

    /*
     * 야놀자·SRT·와이어바알리 자리. 앱 ID 를 적어 뒀는데 스토어가 "없다"고 답한다면
     * 앱이 사라진 것보다 **ID 가 틀렸을 가능성이 훨씬 높다.** 그대로 두면 사이트에
     * "안드로이드 없음"이 사실처럼 나간다.
     */
    if (appValue) {
      const store = (app?.evidence ?? {}) as {
        ios?: { endpoint?: string };
        android?: { endpoint?: string };
      };
      if (hints.ios_app_id && appValue.ios_listed === false) {
        add(
          s,
          'warn',
          'app-id-but-unlisted',
          `iOS 앱 ID(${hints.ios_app_id})를 적어 뒀는데 스토어에 없다고 나온다. ID 가 맞는지 확인할 것 — ${store.ios?.endpoint ?? ''}`,
        );
      }
      if (hints.android_package && appValue.android_listed === false) {
        add(
          s,
          'warn',
          'app-id-but-unlisted',
          `안드로이드 패키지(${hints.android_package})를 적어 뒀는데 스토어에 없다고 나온다. 이름이 맞는지 확인할 것 — ${store.android?.endpoint ?? ''}`,
        );
      }
    }

    /*
     * 웹에는 가입 창구가 없다고 확인해 둔 곳인데 자동 측정이 웹에서 값을 잡아냈다면,
     * 잡은 것이 가입 양식이 아니라 다른 화면일 가능성이 높다.
     */
    if (hints.signup_app_only === true && known(sig.signup_phone_auth)) {
      const m = sig.signup_phone_auth?.method ?? '';
      if (m.startsWith('auto:')) {
        add(
          s,
          'warn',
          'app-only-but-web-value',
          `가입은 앱에서만 된다고 확인해 뒀는데 자동 측정이 웹에서 "${String(sig.signup_phone_auth?.value)}" 를 잡았다. 가입 양식이 맞는지 확인할 것`,
        );
      }
    }

    /*
     * 해외에서 막혀 있다고 해 놓고 같은 실행에서 그 사이트를 읽어냈다면, 둘 중
     * 하나는 틀렸다. 측정 지점이 한 곳이므로 같은 실행 안에서는 같은 답이 나와야 한다.
     */
    if (sig.overseas_access?.value === 'blocked') {
      for (const key of ['i18n_ui', 'signup_phone_auth', 'payment_gate', 'support_en'] as const) {
        const other = sig[key];
        if (other?.confidence === 'auto' && known(other) && sameRun(sig.overseas_access, other)) {
          add(
            s,
            'warn',
            'blocked-but-read',
            `해외에서 막혀 있다고 돼 있는데 같은 실행에서 ${key} 를 자동으로 읽어냈다`,
          );
        }
      }
    }
  }

  return out;
}
