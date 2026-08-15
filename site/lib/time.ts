/**
 * 시각 표기.
 *
 * 서버(빌드)와 브라우저 양쪽에서 쓰이므로 'use client' 파일에 두면 안 된다.
 * 표기는 항상 UTC로 고정한다 — 빌드 머신의 시간대에 따라 결과가 달라지면
 * 커밋 diff가 매일 흔들리고, git 로그가 이 제품의 해자라 그건 손해다.
 */
export function formatUtc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(
    d.getUTCHours(),
  )}:${p(d.getUTCMinutes())} UTC`;
}

/** 2026-08-15 형태만 */
export function formatUtcDate(iso: string): string {
  return formatUtc(iso).slice(0, 10);
}
