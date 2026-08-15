'use client';

import { useEffect, useState } from 'react';

/**
 * "3 hours ago" 같은 상대 시각.
 *
 * 정적 사이트라 빌드 시점에 계산하면 시간이 갈수록 거짓말이 된다.
 * 그래서 서버에서는 아무것도 그리지 않고, 브라우저에서 마운트된 뒤에만 채운다.
 * 절대 시각(UTC)은 항상 옆에 함께 표시되므로 JS가 없어도 정보는 온전하다.
 */
export function RelativeTime({ iso, before }: { iso: string; before?: string }) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return;
    const update = (): void => setText(humanize(Date.now() - t));
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, [iso]);

  // 아직 계산되지 않았으면 구분자까지 통째로 내지 않는다.
  // 안 그러면 서버 HTML에 " · " 만 덩그러니 남는다.
  if (text === null) return null;
  return (
    <span title={iso}>
      {before}
      {text}
    </span>
  );
}

function humanize(ms: number): string {
  if (ms < 0) return 'just now';
  const min = Math.floor(ms / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} day${day === 1 ? '' : 's'} ago`;
  const mon = Math.floor(day / 30);
  if (mon < 12) return `${mon} month${mon === 1 ? '' : 's'} ago`;
  const yr = Math.floor(day / 365);
  return `${yr} year${yr === 1 ? '' : 's'} ago`;
}
