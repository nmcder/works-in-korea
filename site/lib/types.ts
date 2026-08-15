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

export type Confidence = 'auto' | 'community' | 'conflicting' | 'unknown';

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
export type SignupPhoneAuthValue = 'required' | 'optional' | 'not_required' | 'unknown';
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
  hints?: Record<string, string | null> | undefined;
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
