/**
 * 데이터 모델 타입. schema/service.schema.json 과 1:1로 대응한다.
 * 스키마를 고치면 이 파일도 같이 고칠 것.
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

/** 자동 프로브 6종 + 커뮤니티 제보 2종 */
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

/** 봇이 자동으로 측정하는 시그널 (결제·로그인 자동 시도 금지 원칙에 따라 6종만) */
export const AUTO_SIGNAL_KEYS = [
  'overseas_access',
  'i18n_ui',
  'signup_phone_auth',
  'app_availability',
  'payment_gate',
  'support_en',
] as const;
export type AutoSignalKey = (typeof AUTO_SIGNAL_KEYS)[number];

export type Confidence = 'auto' | 'community' | 'conflicting' | 'unknown';

export interface Signal<V = unknown> {
  value: V;
  /** 마지막 측정 시각 (UTC ISO 8601). null = 한 번도 측정된 적 없음 */
  measured_at: string | null;
  /** 현재 value가 처음 관측된 시각 */
  first_seen_at?: string | null;
  /** value가 마지막으로 바뀐 시각 — /changes 페이지의 근거 */
  last_changed_at?: string | null;
  /** `auto:<프로브명>` | `community` | `manual` | `none` */
  method: string;
  confidence: Confidence;
  /** 반증 가능하게 남기는 원본 근거 */
  evidence: Record<string, unknown> | null;
}

export type OverseasAccessValue = 'ok' | 'blocked' | 'degraded' | 'unknown';
export type I18nUiValue = string[] | null;
export type SignupPhoneAuthValue = 'required' | 'optional' | 'not_required' | 'unknown';
export type AppAvailabilityValue = {
  ios_listed: boolean | null;
  android_listed: boolean | null;
  /** 국가별 출시 여부는 현재 측정 방법이 없다. 항상 null. */
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

export interface ServiceHints {
  signup_url?: string | null;
  checkout_url?: string | null;
  support_url?: string | null;
  english_url?: string | null;
  /** App Store 숫자 ID (trackId) */
  ios_app_id?: string | null;
  android_package?: string | null;
}

export interface Service {
  id: string;
  name: { en: string; ko: string };
  url: string;
  category: Category;
  importance: 1 | 2 | 3;
  hints?: ServiceHints;
  signals: Signals;
  notes?: { en?: string | null; ko?: string | null };
}

/** data/seeds/services.seed.json 의 한 항목 (사람이 관리) */
export type SeedService = Pick<Service, 'id' | 'name' | 'url' | 'category' | 'importance'> & {
  hints?: ServiceHints;
  notes?: { en?: string | null; ko?: string | null };
};

/** 프로브 1회 실행 결과. value가 없으면 measured=false로 표시하고 기존 값을 보존한다. */
export interface ProbeResult<V = unknown> {
  value: V;
  confidence: Confidence;
  evidence: Record<string, unknown> | null;
}

/** 하루치 실제 변경 목록 (data/changes/<date>.json) */
export interface ChangeEntry {
  service_id: string;
  signal: SignalKey;
  from: unknown;
  to: unknown;
  changed_at: string;
  /**
   * 이 변경을 관측한 실행의 측정 지점.
   *
   * 없으면 "값이 바뀌었다"와 "우리가 다른 곳에서 쟀다"를 구분할 수 없다.
   * 2026-08-15 측정 지점이 KR→US 로 바뀐 실행에서 39건이 한꺼번에 움직였는데,
   * 이 정보가 없으면 39개 회사가 그날 뭔가 바꾼 것처럼 읽힌다. (D-14)
   */
  vantage_point?: { country: string | null; region: string | null; ip_asn: string | null };
}

export interface RunSummary {
  started_at: string;
  finished_at: string;
  duration_ms: number;
  vantage_point: { id: string; country: string | null; region: string | null; ip_asn: string | null };
  services_total: number;
  services_probed: number;
  signals_measured: number;
  signals_unknown: number;
  changes: number;
  errors: { service_id: string; signal: string; message: string }[];
}
