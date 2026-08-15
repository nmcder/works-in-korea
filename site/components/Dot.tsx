import type { Tone } from '@/lib/present';

/**
 * 상태 아이콘.
 *
 * 색만으로 뜻을 전하면 색을 구분하지 못하는 사람에게는 아무 정보도 아니다 (D-12).
 * 다섯 상태가 서로 다른 **모양**을 갖게 하고, 옆에 항상 글자를 함께 둔다.
 *
 *   open     체크    장벽이 관측되지 않음
 *   barrier  가위표  장벽이 관측됨
 *   mixed    빗금    조건부
 *   info     점      장벽 여부가 아닌 참고값
 *   none     세로선  확인하지 않음 (테두리가 점선)
 */
export function Dot({ tone }: { tone: Tone }) {
  const shape =
    tone === 'open' ? (
      <path d="M2.5 6.2 4.8 8.5 9.5 3.5" />
    ) : tone === 'barrier' ? (
      <path d="M3 3l6 6M9 3l-6 6" />
    ) : tone === 'mixed' ? (
      <path d="M2.5 6h7" />
    ) : tone === 'info' ? (
      <circle cx="6" cy="6" r="2" fill="currentColor" stroke="none" />
    ) : (
      <path d="M6 3.4v5.2" />
    );

  return (
    <span className="dot" aria-hidden>
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {shape}
      </svg>
    </span>
  );
}
