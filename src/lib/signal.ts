/**
 * 시그널 객체를 만드는 유일한 통로.
 * CLAUDE.md 절대규칙 5 — 측정시각/측정방법/신뢰도 3종 메타를 여기서 강제한다.
 * 프로브가 시그널 객체를 직접 리터럴로 만들지 말 것.
 */
import type { Confidence, ProbeResult, Signal } from '../types.js';

/** 값 비교용 안정 직렬화 (키 순서 무관) */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
}

export function valuesEqual(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}

/** 한 번도 측정되지 않은 시그널의 초기 상태 */
export function emptySignal<V>(unknownValue: V): Signal<V> {
  return {
    value: unknownValue,
    measured_at: null,
    first_seen_at: null,
    last_changed_at: null,
    method: 'none',
    confidence: 'unknown',
    evidence: null,
  };
}

export interface ApplyOutcome<V> {
  signal: Signal<V>;
  changed: boolean;
  previousValue: V | undefined;
}

/**
 * 새 측정 결과를 기존 시그널에 반영한다.
 * - measured_at 은 측정할 때마다 갱신 (신선도)
 * - last_changed_at 은 value가 실제로 바뀔 때만 갱신 (/changes 의 근거)
 */
export function applyProbeResult<V>(
  previous: Signal<V> | undefined,
  result: ProbeResult<V>,
  probeName: string,
  now: string,
): ApplyOutcome<V> {
  const method = `auto:${probeName}`;
  const hadPrevious = previous !== undefined && previous.measured_at !== null;
  const changed = hadPrevious ? !valuesEqual(previous.value, result.value) : false;

  return {
    signal: {
      value: result.value,
      measured_at: now,
      first_seen_at: hadPrevious && !changed ? (previous.first_seen_at ?? now) : now,
      last_changed_at: changed ? now : (previous?.last_changed_at ?? null),
      method,
      confidence: result.confidence,
      evidence: result.evidence,
    },
    changed,
    previousValue: previous?.value,
  };
}

/** 측정에 실패했을 때. 기존 값을 지우지 않고 evidence에 실패 사유만 남긴다. */
export function markUnmeasured<V>(
  previous: Signal<V> | undefined,
  unknownValue: V,
  probeName: string,
  reason: string,
  now: string,
): Signal<V> {
  if (previous && previous.measured_at !== null) {
    return {
      ...previous,
      evidence: {
        ...(previous.evidence ?? {}),
        last_attempt_at: now,
        last_attempt_failed: reason,
      },
    };
  }
  return {
    value: unknownValue,
    measured_at: now,
    first_seen_at: now,
    last_changed_at: null,
    method: `auto:${probeName}`,
    confidence: 'unknown',
    evidence: { not_measured: reason },
  };
}

export function confidenceFor(measured: boolean): Confidence {
  return measured ? 'auto' : 'unknown';
}
