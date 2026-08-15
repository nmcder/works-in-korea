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
      en: 'Can you open it from outside Korea?',
      ko: '한국 밖에서 접속되나요?',
    },
  },
  i18n_ui: {
    label: { en: 'Interface languages', ko: '인터페이스 언어' },
    question: {
      en: 'What languages can you use it in?',
      ko: '어떤 언어로 쓸 수 있나요?',
    },
  },
  signup_phone_auth: {
    label: { en: 'Korean phone verification to sign up', ko: '가입 시 한국 휴대폰 본인인증' },
    question: {
      en: 'Do you need a Korean phone to sign up?',
      ko: '가입할 때 한국 휴대폰이 필요한가요?',
    },
  },
  app_availability: {
    label: { en: 'Mobile apps', ko: '모바일 앱' },
    question: {
      en: 'Is there an app?',
      ko: '앱이 있나요?',
    },
  },
  payment_gate: {
    label: { en: 'Payment services', ko: '결제사' },
    question: {
      en: 'Which payment services does it use?',
      ko: '어떤 결제사를 쓰나요?',
    },
  },
  support_en: {
    label: { en: 'English customer support', ko: '영어 고객지원' },
    question: {
      en: 'Is there help in English?',
      ko: '영어 고객지원이 있나요?',
    },
  },
  foreign_card: {
    label: { en: 'Foreign card payment', ko: '해외 발급 카드 결제' },
    question: {
      en: 'Does a foreign card work?',
      ko: '해외 카드로 결제되나요?',
    },
  },
  foreign_phone_sms: {
    label: { en: 'SMS to a foreign number', ko: '해외 번호 SMS 수신' },
    question: {
      en: 'Do codes reach a foreign number?',
      ko: '해외 번호로 인증번호가 오나요?',
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

/**
 * 목록에 열로 세울 3종.
 *
 * support_en 은 뺐다 — 106건 중 105건이 unknown 이라 열 하나를 차지하면서
 * 아무것도 알려주지 않는다. 상세 페이지에는 그대로 나온다.
 */
export const HEADLINE_KEYS: SignalKey[] = ['overseas_access', 'i18n_ui', 'signup_phone_auth'];

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
      ? { en: 'Community reports (conflicting)', ko: '이용자 제보 (엇갈림)' }
      : { en: 'Community report', ko: '이용자 제보' };
  }
  if (method === 'manual') return { en: 'Checked by hand', ko: '수동 확인' };
  if (COMMUNITY_KEYS.includes(key)) {
    return { en: 'Community reports only, by design', ko: '제보로만 채우는 항목' };
  }
  return { en: 'Not measured', ko: '확인 안 함' };
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
      en: 'Nobody has reported trying yet. Confirming this means putting a real card through a real checkout, which we do not automate.',
      ko: '아직 해봤다는 제보가 없습니다. 실제 카드로 결제를 눌러봐야 알 수 있어서 자동으로 확인하지 않습니다.',
    };
  }
  if (key === 'foreign_phone_sms') {
    return {
      kind: 'community-only',
      en: 'Nobody has reported trying yet. Confirming this means requesting a real verification text to a real foreign number, which we do not automate.',
      ko: '아직 해봤다는 제보가 없습니다. 실제 해외 번호로 인증 문자를 받아봐야 알 수 있어서 자동으로 확인하지 않습니다.',
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
        en: 'The site’s robots.txt tells crawlers to stay away from this path, and we obey it. Only a person can answer this one.',
        ko: '이 사이트가 robots.txt로 자동 접근을 막아 뒀습니다. 규칙대로 열지 않았습니다. 직접 써 본 사람만 답할 수 있습니다.',
      };
    case 'bot-block':
      return {
        kind: 'bot-block',
        en: 'The site refused our crawler (HTTP 403/429) instead of serving the page. Bot filtering and country blocking look identical from outside, so we claim neither.',
        ko: '페이지 대신 거부 응답(HTTP 403·429)이 돌아왔습니다. 밖에서 보면 봇 차단과 해외 차단이 똑같이 보여서 어느 쪽인지 단정하지 않습니다.',
      };
    case 'unreachable':
      return {
        kind: 'unreachable',
        en: 'The server never answered from outside Korea — the connection timed out. Deliberate blocking and a transient fault look the same from here.',
        ko: '한국 밖에서 보낸 요청에 서버가 끝내 답하지 않았습니다. 일부러 막은 것인지 그때만 안 된 것인지는 여기서 구분되지 않습니다.',
      };
    case 'tls':
      return {
        kind: 'tls',
        en: 'The certificate chain could not be verified from here, so the connection was dropped before any page arrived. We do not switch certificate checking off to get a reading.',
        ko: '인증서를 검증하지 못해 페이지가 오기 전에 연결이 끊겼습니다. 값을 얻자고 인증서 검사를 끄지는 않습니다.',
      };
    case 'robots-unreadable':
      return {
        kind: 'robots-unreadable',
        en: 'We could not read the site’s robots.txt, and we do not crawl a site whose rules we have not read.',
        ko: 'robots.txt를 읽지 못했습니다. 규칙을 모르는 사이트는 열지 않습니다.',
      };
    case null:
      break;
  }
  if (key === 'app_availability' && blob.includes('앱 ID')) {
    return {
      kind: 'no-app-id',
      en: 'We do not know this service’s App Store / Google Play identifier yet.',
      ko: '이 서비스의 앱 ID를 아직 못 찾았습니다.',
    };
  }
  if (blob.includes('가입 페이지를 찾지 못함')) {
    return {
      kind: 'no-url',
      en: 'We have not found this service’s sign-up page yet. Common paths were tried; none was one.',
      ko: '가입 페이지 주소를 아직 못 찾았습니다. 흔히 쓰는 경로를 눌러봤지만 없었습니다.',
    };
  }
  if (blob.includes('고객지원 페이지를 찾지 못함')) {
    return {
      kind: 'no-url',
      en: 'We have not found this service’s help centre page yet.',
      ko: '고객센터 주소를 아직 못 찾았습니다.',
    };
  }
  if (blob.includes('로그인 화면으로 보임')) {
    return {
      kind: 'inconclusive',
      en: 'The page we reached is a log-in screen, not a sign-up flow.',
      ko: '열린 페이지가 가입이 아니라 로그인 화면이었습니다.',
    };
  }
  if (blob.includes('가입 양식을 확인하지 못함')) {
    return {
      kind: 'inconclusive',
      en: 'The page we reached reads as an information page, not a form with fields to fill in.',
      ko: '열린 페이지에 입력란이 없습니다. 가입 양식이 아니라 안내 문서로 보입니다.',
    };
  }
  if (blob.includes('정상 응답을 받은 페이지가 없어')) {
    return {
      kind: 'bot-block',
      en: 'No page returned a usable response, so there was nothing to scan.',
      ko: '어느 페이지도 정상 응답을 주지 않아 확인할 대상이 없었습니다.',
    };
  }
  if (key === 'support_en') {
    return {
      kind: 'inconclusive',
      en: 'Nothing on the pages we could read states this either way.',
      ko: '읽을 수 있는 페이지에 관련 안내가 없었습니다.',
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
      if (v === 'ok') return { display: { en: 'Yes', ko: '됨' }, tone: 'open' };
      if (v === 'blocked') return { display: { en: 'Blocked', ko: '막힘' }, tone: 'barrier' };
      if (v === 'degraded') return { display: { en: 'Partly', ko: '일부만' }, tone: 'mixed' };
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
          en: names.map((n) => n.en).join(', '),
          ko: names.map((n) => n.ko).join(', '),
        },
        tone: others.includes('en') ? 'open' : 'mixed',
      };
    }
    case 'signup_phone_auth': {
      if (v === 'required')
        return { display: { en: 'Korean phone needed', ko: '한국 휴대폰 필요' }, tone: 'barrier' };
      if (v === 'optional')
        return { display: { en: 'Optional', ko: '선택' }, tone: 'mixed' };
      if (v === 'not_required')
        return { display: { en: 'Not required', ko: '필요 없음' }, tone: 'open' };
      return null;
    }
    case 'app_availability': {
      const a = v as AppAvailabilityValue;
      if (!a) return null;
      const part = (listed: boolean | null, store: string): string =>
        listed === true ? `${store} yes` : listed === false ? `${store} no` : `${store} unknown`;
      const partKo = (listed: boolean | null, store: string): string =>
        listed === true ? `${store} 있음` : listed === false ? `${store} 없음` : `${store} 모름`;
      // "없음"도 기록된 사실이다. 예전에는 둘 다 false 면 tone 을 none 으로 줬는데,
      // 그러면 확인해 놓고 확인 안 한 것처럼 회색으로 나온다. 값이 있으면 info 다.
      return {
        display: {
          en: `${part(a.ios_listed, 'iOS')} · ${part(a.android_listed, 'Android')}`,
          ko: `${partKo(a.ios_listed, 'iOS')} · ${partKo(a.android_listed, 'Android')}`,
        },
        tone: 'info',
      };
    }
    case 'payment_gate': {
      const p = v as PaymentGateValue;
      if (!p) return null;
      if (p.gateways.length === 0) {
        return {
          display: {
            en: 'None found',
            ko: '확인된 것 없음',
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
      if (v === 'yes') return { display: { en: 'Yes', ko: '있음' }, tone: 'open' };
      if (v === 'no') return { display: { en: 'No', ko: '없음' }, tone: 'barrier' };
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
/**
 * 측정 지점별 결과. 없으면 null.
 *
 * 이 값은 서비스만의 속성이 아니라 (서비스 × 어디서 재는가)의 속성이다.
 * 실제로 2026-08-15 에 정부·은행 아홉 곳이 Washington 에서는 열리고
 * Illinois 에서는 응답하지 않았다. 그걸 값 하나로 뭉개면 그날 관측한 가장 중요한
 * 사실이 사라진다. 갈리는 경우에만 보여준다 — 다 같으면 굳이 늘어놓을 이유가 없다.
 */
export function vantageSplit(sig: Signal): { place: string; value: string }[] | null {
  const raw = (sig.evidence as { by_vantage?: Record<string, { value?: string }> } | null)
    ?.by_vantage;
  if (!raw || typeof raw !== 'object') return null;
  const rows = Object.entries(raw)
    .map(([place, v]) => ({ place, value: String(v?.value ?? 'unknown') }))
    .sort((a, b) => a.place.localeCompare(b.place));
  if (rows.length < 2) return null;
  return new Set(rows.map((r) => r.value)).size > 1 ? rows : null;
}

function caveatFor(key: SignalKey, sig: Signal): Bi | null {
  if (key === 'overseas_access') {
    const split = vantageSplit(sig);
    if (split) {
      const en = split.map((r) => `${r.place}: ${r.value === 'ok' ? 'opened' : r.value}`).join(' · ');
      const ko = split
        .map((r) => `${r.place}: ${r.value === 'ok' ? '됨' : r.value === 'blocked' ? '막힘' : '응답 없음'}`)
        .join(' · ');
      return {
        en: `The answer depends on where the check ran from — ${en}. The value above is the most recent one.`,
        ko: `어디서 확인했느냐에 따라 답이 갈립니다 — ${ko}. 위 값은 가장 최근 것입니다.`,
      };
    }
  }
  if (key === 'payment_gate') {
    const p = sig.value as PaymentGateValue;
    if (p && p.gateways.length === 0) {
      return {
        en: 'Public pages only — most checkouts sit behind a login. Not a claim that the service has no gateway.',
        ko: '로그인 없이 열리는 페이지만 본 결과입니다. 결제 화면은 대개 로그인 뒤에 있어서, 결제사가 없다는 뜻은 아닙니다.',
      };
    }
  }
  if (key === 'signup_phone_auth' && sig.value === 'not_required') {
    return {
      en: 'We read the form but never submit it. A check that appears only after submitting would not be visible.',
      ko: '양식을 읽기만 하고 제출은 하지 않습니다. 제출한 뒤에 뜨는 인증은 확인할 수 없습니다.',
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
    display: formatted?.display ?? { en: 'Not measured', ko: '아직 확인 못 함' },
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
