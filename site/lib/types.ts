/**
 * 사이트가 읽는 데이터 모양.
 *
 * 원본(single source of truth)은 `schema/service.schema.json` 이고,
 * 측정 엔진 쪽 타입은 `src/types.ts` 다. 여기 있는 것은 그 둘을 읽기 전용으로 옮긴 사본이다.
 *
 * 왜 import 하지 않고 베꼈나: 엔진(tsconfig NodeNext)과 사이트(bundler)는 모듈 해석 방식이 달라
 * 파일을 가로질러 import 하면 빌드가 환경에 따라 깨진다. 사이트는 데이터를 "읽기만" 하므로
 * 사본을 두는 편이 안전하다.
 *
 * 스키마를 바꾸면 이 파일도 같이 바꿀 것. (`npm run check` 가 데이터 쪽은 잡아준다)
 */

export const CATEGORIES = [
  'transport',
  'ticketing',
  'shopping',
  'delivery',
  'finance',
  'telecom',
  'government',
  'healthcare',
  'accommodation',
  'culture',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const SIGNAL_KEYS = [
  'overseas_access',
  'i18n_ui',
  'signup_phone_auth',
  'app_availability',
  'payment_gate',
  'support_en',
  'foreign_card',
  'foreign_phone_sms',
] as const;
export type SignalKey = (typeof SIGNAL_KEYS)[number];

/**
 * ⚠️ `src/types.ts` 의 같은 이름과 짝이다. 한쪽만 고치면 조용히 어긋난다.
 *
 * 실제로 어긋나 있었다. 엔진에 `manual` 을 더한 날 이 파일을 안 고쳤고, 데이터에는
 * manual 값이 60건 넘게 들어와 있었는데 타입에는 없었다. 걸리지 않은 이유는 이
 * 사이트가 JSON 을 읽어 `Service` 로 단언(cast)하기 때문이다 — 타입 검사가 닿지 않는다.
 * 화면은 `manual` 을 그릴 줄 알았으므로 눈에는 멀쩡해 보였다.
 */
export type Confidence = 'auto' | 'manual' | 'community' | 'conflicting' | 'unknown';

export interface Signal<V = unknown> {
  value: V;
  measured_at: string | null;
  first_seen_at?: string | null;
  last_changed_at?: string | null;
  method: string;
  confidence: Confidence;
  evidence: Record<string, unknown> | null;
}

export type OverseasAccessValue = 'ok' | 'blocked' | 'degraded' | 'unknown';
export type I18nUiValue = string[] | null;
/**
 * 가입할 때 한국 휴대폰이 필요한가.
 *
 * `any_phone` 이 따로 있는 이유: 카카오 계정은 휴대폰 인증을 요구하지만 국가번호에
 * +1·+81·+63 같은 해외 번호를 고를 수 있다. 반면 야놀자·캐치테이블은 010 형식만 받는다.
 * 둘을 똑같이 `required` 로 적으면 화면에 나란히 "한국 휴대폰 필요"로 나가는데,
 * 앞쪽은 본국 번호로 그냥 되고 뒤쪽은 진짜로 막힌다 — 이 사이트를 보러 오는 사람에게
 * 이보다 중요한 구분이 없다. 2026-08-16 손 확인에서 드러났다.
 */
export type SignupPhoneAuthValue =
  | 'required'
  | 'any_phone'
  | 'optional'
  | 'not_required'
  | 'unknown';
export type AppAvailabilityValue = {
  ios_listed: boolean | null;
  android_listed: boolean | null;
  countries: null;
} | null;
export type PaymentGateValue = { gateways: string[]; three_ds: boolean | null } | null;
export type SupportEnValue = 'yes' | 'no' | 'unknown';
export type CommunityValue = 'works' | 'fails' | 'mixed' | 'unknown';

export interface Signals {
  overseas_access?: Signal<OverseasAccessValue>;
  i18n_ui?: Signal<I18nUiValue>;
  signup_phone_auth?: Signal<SignupPhoneAuthValue>;
  app_availability?: Signal<AppAvailabilityValue>;
  payment_gate?: Signal<PaymentGateValue>;
  support_en?: Signal<SupportEnValue>;
  foreign_card?: Signal<CommunityValue>;
  foreign_phone_sms?: Signal<CommunityValue>;
}

export interface Service {
  id: string;
  name: { en: string; ko: string };
  url: string;
  category: Category;
  importance: 1 | 2 | 3;
  hints?: Record<string, string | boolean | null> | undefined;
  signals: Signals;
  notes?: { en?: string | null; ko?: string | null } | undefined;
}

export interface ChangeEntry {
  service_id: string;
  signal: SignalKey;
  from: unknown;
  to: unknown;
  changed_at: string;
  /** 이 변경을 관측한 실행의 측정 지점. 없으면 그 실행이 기록하기 전의 데이터다. (D-14) */
  vantage_point?: { country: string | null; region: string | null; ip_asn: string | null };
}

export interface ChangeFile {
  date: string;
  generated_at: string;
  changes: ChangeEntry[];
}

export interface RunSummary {
  started_at: string;
  finished_at: string;
  duration_ms: number;
  vantage_point: {
    id: string;
    country: string | null;
    region: string | null;
    ip_asn: string | null;
  };
  services_total: number;
  services_probed: number;
  signals_measured: number;
  signals_unknown: number;
  changes: number;
  errors: { service_id: string; signal: string; message: string }[];
}
