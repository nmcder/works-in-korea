/**
 * data/services/*.json 읽기·쓰기.
 * 파일은 git에 커밋되므로 diff가 읽히도록 키 순서를 항상 고정한다.
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PATHS } from '../config.js';
import { AUTO_SIGNAL_KEYS, SIGNAL_KEYS } from '../types.js';
import type {
  AppAvailabilityValue,
  CommunityValue,
  I18nUiValue,
  OverseasAccessValue,
  PaymentGateValue,
  SeedService,
  Service,
  SignalKey,
  Signals,
  SignupPhoneAuthValue,
  SupportEnValue,
} from '../types.js';
import { emptySignal } from './signal.js';

export async function loadSeeds(): Promise<SeedService[]> {
  const raw = await readFile(PATHS.seeds, 'utf8');
  const parsed = JSON.parse(raw) as { services: SeedService[] };
  if (!Array.isArray(parsed.services)) throw new Error('services.seed.json: services 배열이 없다');
  const ids = new Set<string>();
  for (const s of parsed.services) {
    if (ids.has(s.id)) throw new Error(`services.seed.json: id 중복 — ${s.id}`);
    ids.add(s.id);
  }
  return parsed.services;
}

export async function loadService(id: string): Promise<Service | null> {
  try {
    const raw = await readFile(path.join(PATHS.services, `${id}.json`), 'utf8');
    return JSON.parse(raw) as Service;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw e;
  }
}

export async function listServiceIds(): Promise<string[]> {
  try {
    const files = await readdir(PATHS.services);
    return files.filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort();
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw e;
  }
}

export async function saveService(service: Service): Promise<void> {
  await mkdir(PATHS.services, { recursive: true });
  const file = path.join(PATHS.services, `${service.id}.json`);
  await writeFile(file, `${JSON.stringify(orderService(service), null, 2)}\n`, 'utf8');
}

export async function writeJson(file: string, data: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

/** 시드 항목을 서비스 레코드로 승격. 기존 파일이 있으면 측정값을 보존하고 메타만 갱신한다. */
export function mergeSeed(seed: SeedService, existing: Service | null): Service {
  return {
    id: seed.id,
    name: seed.name,
    url: seed.url,
    category: seed.category,
    importance: seed.importance,
    hints: normalizeHints(seed.hints),
    signals: withDefaults(existing?.signals),
    notes: seed.notes ?? existing?.notes ?? { en: null, ko: null },
  };
}

/**
 * 누락된 시그널 키를 "한 번도 측정된 적 없음" 상태로 채운다.
 * SIGNAL_KEYS에 키를 추가하면 아래 COVERAGE에서 컴파일 에러가 나므로 빠뜨릴 수 없다.
 */
function withDefaults(existing: Signals | undefined): Signals {
  const s: Signals = { ...(existing ?? {}) };
  s.overseas_access ??= emptySignal<OverseasAccessValue>('unknown');
  s.i18n_ui ??= emptySignal<I18nUiValue>(null);
  s.signup_phone_auth ??= emptySignal<SignupPhoneAuthValue>('unknown');
  s.app_availability ??= emptySignal<AppAvailabilityValue>(null);
  s.payment_gate ??= emptySignal<PaymentGateValue>(null);
  s.support_en ??= emptySignal<SupportEnValue>('unknown');
  s.foreign_card ??= emptySignal<CommunityValue>('unknown');
  s.foreign_phone_sms ??= emptySignal<CommunityValue>('unknown');
  return s;
}

/** withDefaults가 모든 시그널 키를 덮는지 컴파일 타임에 강제하는 장치 */
const COVERAGE: Record<SignalKey, true> = {
  overseas_access: true,
  i18n_ui: true,
  signup_phone_auth: true,
  app_availability: true,
  payment_gate: true,
  support_en: true,
  foreign_card: true,
  foreign_phone_sms: true,
};
void COVERAGE;

function normalizeHints(hints: SeedService['hints']): Service['hints'] {
  return {
    signup_url: hints?.signup_url ?? null,
    checkout_url: hints?.checkout_url ?? null,
    support_url: hints?.support_url ?? null,
    english_url: hints?.english_url ?? null,
    ios_app_id: hints?.ios_app_id ?? null,
    android_package: hints?.android_package ?? null,
  };
}

/** JSON 키 순서 고정 — git diff가 값 변화만 보여주도록 */
function orderService(service: Service): Record<string, unknown> {
  const signals: Record<string, unknown> = {};
  for (const key of SIGNAL_KEYS) {
    const signal = service.signals[key];
    if (!signal) continue;
    signals[key] = {
      value: signal.value,
      measured_at: signal.measured_at,
      first_seen_at: signal.first_seen_at ?? null,
      last_changed_at: signal.last_changed_at ?? null,
      method: signal.method,
      confidence: signal.confidence,
      evidence: signal.evidence,
    };
  }
  return {
    id: service.id,
    name: { en: service.name.en, ko: service.name.ko },
    url: service.url,
    category: service.category,
    importance: service.importance,
    hints: service.hints,
    signals,
    notes: service.notes ?? { en: null, ko: null },
  };
}

export { AUTO_SIGNAL_KEYS };
