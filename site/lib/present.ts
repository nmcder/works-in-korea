/**
 * 데이터 → 화면 문구.
 *
 * 이 파일이 지키는 규칙 (CLAUDE.md 절대규칙 5·6):
 *   1. 값마다 "언제 / 어떻게 / 얼마나 믿을 만한가"를 반드시 함께 낸다.
 *   2. 평가하지 않고 사실만 쓴다. "불친절함" ❌ / "가입 단계에서 본인인증이 요구됨" ⭕
 *   3. 모르는 것은 빈칸으로 두지 않고 "왜 모르는지"를 쓴다.
 *      모른다고 말하는 것이 이 제품의 자산이므로 감추면 안 된다.
 *
 * 주 사용자가 외국인이라 영어를 먼저 쓰고 한국어를 병기한다.
 */
import type {
  AppAvailabilityValue,
  Confidence,
  I18nUiValue,
  PaymentGateValue,
  Service,
  Signal,
  SignalKey,
} from './types';

export interface Bi {
  en: string;
  ko: string;
}

/**
 * 색의 의미. "좋다/나쁘다"가 아니라 "외국인 방문자 앞에 장벽이 있는가"를 나타낸다.
 * 이 사이트가 던지는 질문 자체가 그것이므로, 사실 기술의 범위 안에 있다.
 *   open    장벽이 관측되지 않음
 *   barrier 장벽이 관측됨
 *   mixed   조건부
 *   info    장벽 여부를 뜻하지 않는 참고값 (예: 탐지된 결제사)
 *   none    측정하지 않음 — 일부러 비워둔 칸
 */
export type Tone = 'open' | 'barrier' | 'mixed' | 'info' | 'none';

export type WhyKind =
  | 'robots'
  | 'bot-block'
  | 'unreachable'
  | 'tls'
  | 'robots-unreadable'
  | 'no-url'
  | 'no-app-id'
  | 'inconclusive'
  | 'community-only'
  | 'other';

/**
 * 자동 측정이 막힌 이유를 근거에서 가려낸다.
 *
 * ⚠️ 여기서 대충 하면 회사가 하지도 않은 일을 했다고 쓰게 된다.
 * 엔진은 두 가지 전혀 다른 상황에 모두 'robots' 라는 낱말이 들어간 문자열을 남긴다.
 *
 *   "robots: Disallow: /"                            사이트가 크롤러를 금지했다
 *   "robots: robots-unavailable(CONNECT_TIMEOUT)"    robots.txt 를 읽지도 못했다
 *
 * 앞의 것은 사이트의 의사표시고, 뒤의 것은 우리가 서버에 닿지도 못했다는 뜻이다.
 * 낱말만 보고 뭉뚱그리면 후자를 "이 회사가 자동 접근을 금지함"으로 발표하게 되는데,
 * 그건 사실이 아닐뿐더러 **진짜 발견(해외에서 접속이 안 됨)을 덮어버린다.**
 * 2026-08-15 미국 러너 첫 실행에서 티머니·고속버스가 실제로 이 상태였다.
 */
export type BlockKind =
  | 'robots-disallow'
  | 'bot-block'
  | 'unreachable'
  | 'tls'
  | 'robots-unreadable'
  | null;

export function classifyBlock(evidence: unknown): BlockKind {
  const raw = JSON.stringify(evidence ?? {});

  // robots.txt 를 "못 읽은" 경우를 먼저 걸러낸다. 순서를 바꾸면 안 된다.
  const unavailable = /robots-unavailable\(([^)]*)\)/.exec(raw);
  if (unavailable) {
    const detail = unavailable[1] ?? '';
    if (/CERT|SIGNATURE|TLS|SSL/i.test(detail)) return 'tls';
    if (/TIMEOUT|ECONNREFUSED|ENOTFOUND|ECONNRESET|EAI_AGAIN|SOCKET|DNS/i.test(detail)) {
      return 'unreachable';
    }
    return 'robots-unreadable';
  }

  if (/robots:\s*Disallow/i.test(raw)) return 'robots-disallow';
  if (/"http_status":\s*(403|429)/.test(raw) || /http_status=(403|429)/.test(raw)) return 'bot-block';
  return null;
}

export interface SignalView {
  key: SignalKey;
  label: Bi;
  question: Bi;
  /** 화면에 크게 나가는 값 */
  display: Bi;
  tone: Tone;
  measuredAt: string | null;
  lastChangedAt: string | null;
  method: string;
  methodLabel: Bi;
  confidence: Confidence;
  /** 값이 없을 때만 채워진다 */
  why: (Bi & { kind: WhyKind }) | null;
  /** 값이 있어도 오해를 부를 수 있을 때 붙는 한 줄 */
  caveat: Bi | null;
  /** 제보로만 채워지는 항목인데 아직 제보가 없는 상태 */
  awaitingReport: boolean;
  evidence: Record<string, unknown> | null;
}

const SIGNAL_META: Record<SignalKey, { label: Bi; question: Bi }> = {
  overseas_access: {
    label: { en: 'Access from abroad', ko: '해외 접속' },
    question: {
      en: 'Does the site load from an IP outside Korea?',
      ko: '한국 밖 IP에서 사이트가 열리는가?',
    },
  },
  i18n_ui: {
    label: { en: 'Interface languages', ko: '인터페이스 언어' },
    question: {
      en: 'Which languages does the interface actually offer?',
      ko: '인터페이스가 실제로 제공하는 언어는?',
    },
  },
  signup_phone_auth: {
    label: { en: 'Korean phone verification to sign up', ko: '가입 시 한국 휴대폰 본인인증' },
    question: {
      en: 'Does signing up force Korean mobile identity verification?',
      ko: '가입에 한국 휴대폰 본인인증이 강제되는가?',
    },
  },
  app_availability: {
    label: { en: 'Mobile apps', ko: '모바일 앱' },
    question: {
      en: 'Is there an app listed on the App Store and Google Play?',
      ko: 'App Store·Google Play에 앱이 등록되어 있는가?',
    },
  },
  payment_gate: {
    label: { en: 'Payment gateways seen', ko: '탐지된 결제사' },
    question: {
      en: 'Which payment providers appear on the public pages?',
      ko: '공개 페이지에서 어떤 결제사가 보이는가?',
    },
  },
  support_en: {
    label: { en: 'English customer support', ko: '영어 고객지원' },
    question: {
      en: 'Does the service state that it offers support in English?',
      ko: '영어 고객지원을 제공한다고 명시하는가?',
    },
  },
  foreign_card: {
    label: { en: 'Foreign card payment', ko: '해외 발급 카드 결제' },
    question: {
      en: 'Does a card issued outside Korea actually go through?',
      ko: '해외 발급 카드로 결제가 실제로 되는가?',
    },
  },
  foreign_phone_sms: {
    label: { en: 'SMS to a foreign number', ko: '해외 번호 SMS 수신' },
    question: {
      en: 'Do verification texts arrive at a non-Korean number?',
      ko: '해외 번호로 인증 문자가 도착하는가?',
    },
  },
};

/** 자동으로 재는 6종. 나머지 2종은 결제·로그인 자동 시도 금지 원칙 때문에 사람 제보로만 채운다. */
export const AUTO_KEYS: SignalKey[] = [
  'overseas_access',
  'i18n_ui',
  'signup_phone_auth',
  'app_availability',
  'payment_gate',
  'support_en',
];

export const COMMUNITY_KEYS: SignalKey[] = ['foreign_card', 'foreign_phone_sms'];

/** 홈 목록에 압축해서 보여줄 4종 */
export const HEADLINE_KEYS: SignalKey[] = [
  'overseas_access',
  'i18n_ui',
  'signup_phone_auth',
  'support_en',
];

const LANGUAGE_NAMES: Record<string, Bi> = {
  ko: { en: 'Korean', ko: '한국어' },
  en: { en: 'English', ko: '영어' },
  ja: { en: 'Japanese', ko: '일본어' },
  zh: { en: 'Chinese', ko: '중국어' },
  de: { en: 'German', ko: '독일어' },
  es: { en: 'Spanish', ko: '스페인어' },
  fr: { en: 'French', ko: '프랑스어' },
  ru: { en: 'Russian', ko: '러시아어' },
  id: { en: 'Indonesian', ko: '인도네시아어' },
  ms: { en: 'Malay', ko: '말레이어' },
  ne: { en: 'Nepali', ko: '네팔어' },
  th: { en: 'Thai', ko: '태국어' },
  tl: { en: 'Tagalog', ko: '타갈로그어' },
  vi: { en: 'Vietnamese', ko: '베트남어' },
};

export function languageName(code: string): Bi {
  return LANGUAGE_NAMES[code] ?? { en: code.toUpperCase(), ko: code.toUpperCase() };
}

const GATEWAY_NAMES: Record<string, string> = {
  naverpay: 'NaverPay',
  kakaopay: 'KakaoPay',
  tosspayments: 'Toss Payments',
  payco: 'PAYCO',
  danal: 'Danal',
  paypal: 'PayPal',
  inicis: 'KG Inicis',
  nicepay: 'NicePay',
  kcp: 'NHN KCP',
  stripe: 'Stripe',
  eximbay: 'Eximbay',
  adyen: 'Adyen',
};

export function gatewayName(id: string): string {
  return GATEWAY_NAMES[id] ?? id;
}

function methodLabel(key: SignalKey, method: string, confidence: Confidence): Bi {
  if (method.startsWith('auto:')) {
    return { en: 'Automated probe', ko: '자동 프로브' };
  }
  if (method === 'community') {
    return confidence === 'conflicting'
      ? { en: 'Community reports (conflicting)', ko: '커뮤니티 제보 (엇갈림)' }
      : { en: 'Community report', ko: '커뮤니티 제보' };
  }
  if (method === 'manual') return { en: 'Checked by hand', ko: '수동 확인' };
  if (COMMUNITY_KEYS.includes(key)) {
    return { en: 'Community reports only — by design', ko: '커뮤니티 제보 전용 — 의도된 설계' };
  }
  return { en: 'Not measured', ko: '측정 안 함' };
}

/**
 * "왜 값이 없는가"를 근거에서 읽어낸다.
 *
 * 근거 문자열은 엔진이 한국어로 남긴다. 여기서 영어 문구로 옮기되,
 * 못 알아본 경우 원문을 그대로 노출한다 — 임의로 지어내지 않는다.
 */
function explainMissing(key: SignalKey, sig: Signal): (Bi & { kind: WhyKind }) | null {
  if (key === 'foreign_card') {
    return {
      kind: 'community-only',
      en: 'Nobody has reported trying yet. The only way to establish this is to put a real card through a real checkout, which we do not automate — so this stays blank until someone who paid tells us how it went.',
      ko: '아직 시도했다는 제보가 없다. 확인하려면 실제 카드로 실제 결제를 해야 하는데 그것은 자동화하지 않는다. 결제해 본 사람이 알려줄 때까지 비워 둔다.',
    };
  }
  if (key === 'foreign_phone_sms') {
    return {
      kind: 'community-only',
      en: 'Nobody has reported trying yet. The only way to establish this is to request a real verification text to a real foreign number, which we do not automate — so this stays blank until someone who tried tells us whether it arrived.',
      ko: '아직 시도했다는 제보가 없다. 확인하려면 실제 해외 번호로 실제 인증 문자를 요청해야 하는데 그것은 자동화하지 않는다. 해 본 사람이 알려줄 때까지 비워 둔다.',
    };
  }

  const ev = (sig.evidence ?? {}) as Record<string, unknown>;
  const texts: string[] = [];
  const collect = (v: unknown): void => {
    if (typeof v === 'string') texts.push(v);
    else if (Array.isArray(v)) v.forEach(collect);
    else if (v && typeof v === 'object') {
      for (const [k, inner] of Object.entries(v as Record<string, unknown>)) {
        if (k === 'not_measured' || k === 'note' || k === 'reason' || k === 'blockedReason') {
          collect(inner);
        }
      }
    }
  };
  collect(ev.not_measured);
  collect(ev.note);
  collect(ev.vantage_points);
  collect(ev.scanned);
  const blob = texts.join(' | ');

  switch (classifyBlock(ev)) {
    case 'robots-disallow':
      return {
        kind: 'robots',
        en: 'This site’s robots.txt tells automated clients to stay away from this path, so our crawler does not fetch it. That is our choice, not a failure — and it means only a person can answer this one.',
        ko: '이 사이트의 robots.txt가 해당 경로에 자동 접근을 금지하고 있어 크롤러가 요청하지 않는다. 실패가 아니라 지키기로 한 규칙이며, 그래서 이 항목은 사람만 답할 수 있다.',
      };
    case 'bot-block':
      return {
        kind: 'bot-block',
        en: 'The site answered our crawler with a refusal (HTTP 403/429) rather than the page. Bot filtering and country blocking look identical from outside, so we do not claim either.',
        ko: '사이트가 페이지 대신 거부 응답(HTTP 403/429)을 돌려줬다. 바깥에서는 봇 차단과 지역 차단이 똑같아 보이므로 어느 쪽이라고도 단정하지 않는다.',
      };
    case 'unreachable':
      return {
        kind: 'unreachable',
        en: 'The server did not answer at all from our vantage point outside Korea — the connection timed out before any page was served. We cannot tell from here whether foreign or datacentre addresses are being dropped deliberately, or whether this was a transient fault, so we record no value. This is worth a first-hand check.',
        ko: '한국 밖 측정 지점에서 서버가 아예 응답하지 않았다. 페이지를 받기 전에 연결이 시간 초과됐다. 해외·데이터센터 주소를 의도적으로 버리는 것인지 일시적 장애인지 여기서는 구분할 수 없어 값을 남기지 않는다. 실제로 확인해 볼 가치가 있는 항목이다.',
      };
    case 'tls':
      return {
        kind: 'tls',
        en: 'The site’s TLS certificate chain could not be verified from our vantage point, so the connection was dropped before any page arrived. Browsers can sometimes repair an incomplete chain on their own; our client does not, and we will not switch certificate checking off just to obtain a reading.',
        ko: 'TLS 인증서 체인을 검증하지 못해 페이지가 오기 전에 연결이 끊겼다. 브라우저는 끊긴 체인을 스스로 보완하기도 하지만 우리 클라이언트는 그러지 않으며, 값을 얻자고 인증서 검사를 끄지는 않는다.',
      };
    case 'robots-unreadable':
      return {
        kind: 'robots-unreadable',
        en: 'We could not read this site’s robots.txt, and we do not crawl a site whose rules we have not managed to read. That is a conservative default on our side, not a statement about the site.',
        ko: '이 사이트의 robots.txt를 읽지 못했다. 규칙을 확인하지 못한 사이트는 크롤링하지 않는다. 사이트에 대한 판단이 아니라 우리 쪽의 보수적 기본값이다.',
      };
    case null:
      break;
  }
  if (key === 'app_availability' && blob.includes('앱 ID')) {
    return {
      kind: 'no-app-id',
      en: 'We do not yet know this service’s App Store / Google Play identifier, so there is nothing to look up.',
      ko: '이 서비스의 App Store·Google Play 식별자를 아직 모른다. 조회할 대상이 없다.',
    };
  }
  if (blob.includes('가입 페이지를 찾지 못함')) {
    return {
      kind: 'no-url',
      en: 'We have not found the URL of this service’s sign-up page yet. Common paths were tried and none of them was one.',
      ko: '이 서비스의 가입 페이지 주소를 아직 찾지 못했다. 흔한 경로를 눌러봤지만 해당하는 것이 없었다.',
    };
  }
  if (blob.includes('고객지원 페이지를 찾지 못함')) {
    return {
      kind: 'no-url',
      en: 'We have not found the URL of this service’s support or help centre page yet.',
      ko: '이 서비스의 고객센터·도움말 페이지 주소를 아직 찾지 못했다.',
    };
  }
  if (blob.includes('로그인 화면으로 보임')) {
    return {
      kind: 'inconclusive',
      en: 'The page we reached is a log-in screen, not a sign-up flow. Judging sign-up requirements from it would mean reporting something we did not actually look at.',
      ko: '도달한 페이지가 가입 절차가 아니라 로그인 화면이다. 그것을 근거로 가입 요건을 발표하면 재지 않은 것을 발표하는 셈이다.',
    };
  }
  if (blob.includes('가입 양식을 확인하지 못함')) {
    return {
      kind: 'inconclusive',
      en: 'The page we reached reads as an information page rather than a real sign-up form — no fields to fill in. A form with no verification widget only means something if it is an actual form.',
      ko: '도달한 페이지가 실제 가입 양식이 아니라 안내 문서로 보인다 — 채울 입력란이 없다. "본인인증 위젯이 없다"는 진짜 양식을 봤을 때만 의미가 있다.',
    };
  }
  if (blob.includes('정상 응답을 받은 페이지가 없어')) {
    return {
      kind: 'bot-block',
      en: 'No page returned a usable response, so there was nothing to scan.',
      ko: '정상 응답을 받은 페이지가 없어 스캔할 대상이 없었다.',
    };
  }
  if (key === 'support_en') {
    return {
      kind: 'inconclusive',
      en: 'Nothing on the pages we could read states this either way. We do not record a value on weak evidence.',
      ko: '읽을 수 있었던 페이지에 이에 대한 명시적 진술이 없다. 약한 근거로는 값을 남기지 않는다.',
    };
  }
  return {
    kind: 'other',
    en: blob ? `Not recorded. Engine note: ${blob.slice(0, 220)}` : 'Not recorded yet.',
    ko: blob ? `기록되지 않음. 엔진 기록: ${blob.slice(0, 220)}` : '아직 기록되지 않음.',
  };
}

function formatValue(key: SignalKey, sig: Signal): { display: Bi; tone: Tone } | null {
  const v = sig.value;
  if (sig.confidence === 'unknown' || v === null || v === undefined) return null;

  switch (key) {
    case 'overseas_access': {
      if (v === 'ok') return { display: { en: 'Loads', ko: '열림' }, tone: 'open' };
      if (v === 'blocked')
        return { display: { en: 'Blocked', ko: '차단됨' }, tone: 'barrier' };
      if (v === 'degraded')
        return { display: { en: 'Partly loads', ko: '일부만 열림' }, tone: 'mixed' };
      return null;
    }
    case 'i18n_ui': {
      const langs = (v as I18nUiValue) ?? [];
      if (langs.length === 0) return null;
      const others = langs.filter((l) => l !== 'ko');
      if (others.length === 0)
        return { display: { en: 'Korean only', ko: '한국어만' }, tone: 'barrier' };
      const names = others.map((l) => languageName(l));
      return {
        display: {
          en: `Korean + ${names.map((n) => n.en).join(', ')}`,
          ko: `한국어 + ${names.map((n) => n.ko).join(', ')}`,
        },
        tone: others.includes('en') ? 'open' : 'mixed',
      };
    }
    case 'signup_phone_auth': {
      if (v === 'required')
        return { display: { en: 'Required', ko: '필수' }, tone: 'barrier' };
      if (v === 'optional')
        return { display: { en: 'One option among others', ko: '선택 가능' }, tone: 'mixed' };
      if (v === 'not_required')
        return { display: { en: 'Not seen on the form', ko: '양식에서 보이지 않음' }, tone: 'open' };
      return null;
    }
    case 'app_availability': {
      const a = v as AppAvailabilityValue;
      if (!a) return null;
      const part = (listed: boolean | null, store: string): string =>
        listed === true ? `${store}: listed` : listed === false ? `${store}: not found` : `${store}: unknown`;
      const partKo = (listed: boolean | null, store: string): string =>
        listed === true ? `${store} 있음` : listed === false ? `${store} 없음` : `${store} 모름`;
      return {
        display: {
          en: `${part(a.ios_listed, 'iOS')} · ${part(a.android_listed, 'Android')}`,
          ko: `${partKo(a.ios_listed, 'iOS')} · ${partKo(a.android_listed, 'Android')}`,
        },
        tone: a.ios_listed || a.android_listed ? 'info' : 'none',
      };
    }
    case 'payment_gate': {
      const p = v as PaymentGateValue;
      if (!p) return null;
      if (p.gateways.length === 0) {
        return {
          display: {
            en: 'None on public pages',
            ko: '공개 페이지에서 없음',
          },
          tone: 'info',
        };
      }
      return {
        display: {
          en: p.gateways.map(gatewayName).join(', '),
          ko: p.gateways.map(gatewayName).join(', '),
        },
        tone: 'info',
      };
    }
    case 'support_en': {
      if (v === 'yes') return { display: { en: 'Stated', ko: '명시함' }, tone: 'open' };
      if (v === 'no') return { display: { en: 'Not stated', ko: '명시 없음' }, tone: 'barrier' };
      return null;
    }
    case 'foreign_card':
    case 'foreign_phone_sms': {
      if (v === 'works') return { display: { en: 'Reported to work', ko: '된다는 제보' }, tone: 'open' };
      if (v === 'fails') return { display: { en: 'Reported to fail', ko: '안 된다는 제보' }, tone: 'barrier' };
      if (v === 'mixed') return { display: { en: 'Reports disagree', ko: '제보가 엇갈림' }, tone: 'mixed' };
      return null;
    }
  }
}

const EMPTY_SIGNAL: Signal = {
  value: null,
  measured_at: null,
  method: 'none',
  confidence: 'unknown',
  evidence: null,
};

/**
 * 값이 있어도 그대로 읽으면 오해가 되는 경우에 붙이는 단서.
 * 값을 흐리려는 게 아니라, 측정 범위를 값과 같은 자리에서 밝히는 것이다.
 */
function caveatFor(key: SignalKey, sig: Signal): Bi | null {
  if (key === 'payment_gate') {
    const p = sig.value as PaymentGateValue;
    if (p && p.gateways.length === 0) {
      return {
        en: 'This means nothing was detected on the pages we can open without logging in — most checkouts sit behind a login. It is not a claim that the service has no payment gateway.',
        ko: '로그인 없이 열 수 있는 페이지에서 탐지되지 않았다는 뜻이다. 결제 페이지는 대개 로그인 뒤에 있다. "결제사가 없다"는 뜻이 아니다.',
      };
    }
  }
  if (key === 'signup_phone_auth' && sig.value === 'not_required') {
    return {
      en: 'We read the sign-up form; we never fill it in. A verification step that only appears after you submit would not be visible to us.',
      ko: '가입 양식을 읽기만 하고 제출하지 않는다. 제출한 뒤에야 나타나는 인증 단계는 여기서 보이지 않는다.',
    };
  }
  return null;
}

export function viewSignal(service: Service, key: SignalKey): SignalView {
  const sig = (service.signals[key] ?? EMPTY_SIGNAL) as Signal;
  const meta = SIGNAL_META[key];
  const formatted = formatValue(key, sig);

  return {
    key,
    label: meta.label,
    question: meta.question,
    display: formatted?.display ?? { en: 'Not measured', ko: '측정 안 됨' },
    tone: formatted?.tone ?? 'none',
    measuredAt: sig.measured_at ?? null,
    lastChangedAt: sig.last_changed_at ?? null,
    method: sig.method,
    methodLabel: methodLabel(key, sig.method, sig.confidence),
    confidence: sig.confidence,
    why: formatted ? null : explainMissing(key, sig),
    caveat: formatted ? caveatFor(key, sig) : null,
    awaitingReport: COMMUNITY_KEYS.includes(key) && sig.method === 'none',
    evidence: sig.evidence,
  };
}

export function viewAll(service: Service): SignalView[] {
  return [...AUTO_KEYS, ...COMMUNITY_KEYS].map((k) => viewSignal(service, k));
}

/**
 * /changes 에서 from → to 를 사람이 읽을 수 있게 옮긴다.
 * 원본은 시그널 값 그 자체(문자열·배열·객체)라 맥락 없이는 읽히지 않는다.
 */
export function describeRawValue(key: SignalKey, value: unknown): string {
  if (value === null || value === undefined || value === 'unknown') return 'not measured';
  const formatted = formatValue(key, {
    value,
    measured_at: null,
    method: 'auto',
    confidence: 'auto',
    evidence: null,
  });
  return formatted?.display.en ?? 'not measured';
}

export function signalLabel(key: SignalKey): Bi {
  return SIGNAL_META[key].label;
}

export const CATEGORY_LABELS: Record<string, Bi> = {
  transport: { en: 'Transport', ko: '교통' },
  ticketing: { en: 'Ticketing', ko: '예매' },
  shopping: { en: 'Shopping', ko: '쇼핑' },
  delivery: { en: 'Delivery', ko: '배달' },
  finance: { en: 'Finance', ko: '금융' },
  telecom: { en: 'Telecom', ko: '통신' },
  government: { en: 'Government', ko: '행정' },
  healthcare: { en: 'Healthcare', ko: '의료' },
  accommodation: { en: 'Accommodation', ko: '숙박' },
  culture: { en: 'Culture', ko: '문화' },
};

/** 값이 실제로 기록된 시그널 수 */
export function measuredCount(service: Service): number {
  return viewAll(service).filter((v) => v.tone !== 'none').length;
}

/**
 * 자동 측정이 원천적으로 막혀 있는가, 그렇다면 어떤 종류인가.
 *
 * 다섯 가지는 전부 다른 사실이고 섞으면 안 된다 (classifyBlock 주석 참고).
 * "아직 안 쟀다"와도 다르다 — 사람의 제보 말고는 채울 방법이 없다는 뜻이다. (D-9)
 */
export function crawlBlock(service: Service): BlockKind {
  const sig = service.signals.overseas_access;
  if (!sig || sig.confidence !== 'unknown') return null;
  return classifyBlock(sig.evidence);
}

/** 화면에 쓰는 짧은 이름 */
export const BLOCK_LABELS: Record<NonNullable<BlockKind>, Bi> = {
  'robots-disallow': { en: 'robots.txt says no', ko: 'robots.txt 금지' },
  'bot-block': { en: 'refuses our crawler', ko: '크롤러 거부' },
  unreachable: { en: 'no answer from abroad', ko: '해외에서 응답 없음' },
  tls: { en: 'certificate not verifiable', ko: '인증서 검증 실패' },
  'robots-unreadable': { en: 'robots.txt unreadable', ko: 'robots.txt 못 읽음' },
};
