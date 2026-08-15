/**
 * 언어 전환 — 서버 없이, 깜빡임 없이.
 *
 * 정적 사이트(output: 'export')라 요청 시점에 언어를 고를 서버가 없다.
 * 흔한 대안인 "마운트 후 상태로 교체"는 한국어 사용자에게 영어가 한 번 번쩍이고,
 * 서버 HTML과 클라이언트 첫 렌더가 달라 hydration 경고도 난다.
 *
 * 그래서 두 언어를 모두 HTML에 넣고 CSS로 한쪽만 보이게 한다.
 *   - <head> 인라인 스크립트가 그리기 전에 <html data-lang> 을 정한다 → 깜빡임 없음
 *   - 두 언어가 항상 DOM에 있으므로 hydration 불일치가 원리적으로 불가능
 *   - JS가 꺼져 있어도 영어가 보인다
 *   - display:none 이라 스크린리더도 한쪽만 읽는다
 *
 * 비용은 HTML 크기가 텍스트만큼 늘어나는 것인데, 이 사이트는 이미 근거 JSON이
 * 본문보다 훨씬 크므로 체감 차이가 없다.
 */
import type { ReactNode } from 'react';

export type Lang = 'en' | 'ko';
export const LANGS: Lang[] = ['en', 'ko'];
export const DEFAULT_LANG: Lang = 'en';

/** 두 언어 문자열 쌍. 데이터 계층(present.ts)이 쓰는 것과 같은 모양이다. */
export interface Bi {
  en: string;
  ko: string;
}

/**
 * 문구 하나를 두 언어로 낸다.
 *
 *   <T en="Loads" ko="열림" />
 *   <T {...signal.display} />
 */
export function T({ en, ko, as }: Bi & { as?: 'span' | 'div' | 'p' }): ReactNode {
  const Tag = as ?? 'span';
  return (
    <>
      <Tag lang="en" data-l="en">
        {en}
      </Tag>
      <Tag lang="ko" data-l="ko">
        {ko}
      </Tag>
    </>
  );
}

/** 문단처럼 블록으로 나와야 할 때 */
export function TBlock({ en, ko, className }: Bi & { className?: string }): ReactNode {
  return (
    <>
      <p lang="en" data-l="en" className={className}>
        {en}
      </p>
      <p lang="ko" data-l="ko" className={className}>
        {ko}
      </p>
    </>
  );
}

/**
 * 문구가 아니라 요소 덩어리가 언어별로 다를 때 (표, 목록 등).
 * display:contents 는 CSS 클래스로 준다 — 인라인 스타일로 주면 숨김 규칙을 이겨버린다.
 */
export function Only({ lang, children }: { lang: Lang; children: ReactNode }): ReactNode {
  return (
    <span lang={lang} data-l={lang} className="contents">
      {children}
    </span>
  );
}

/**
 * 그리기 전에 실행되어 <html data-lang> 을 확정한다.
 * layout 의 <head> 에 인라인으로 들어가므로 짧고 예외에 안전해야 한다.
 *
 * 브라우저 언어(navigator.language)는 일부러 보지 않는다. 기본값은 언제나 영어이고,
 * 한국어는 **사용자가 직접 눌렀을 때만** 나온다. 주 사용자가 외국인이기도 하지만,
 * 그보다 한국에서 접속한 외국인의 브라우저가 한국어로 설정돼 있는 경우가 흔해서
 * 자동 감지가 오히려 자주 틀린다.
 */
export const LANG_BOOTSTRAP = `(function(){var l='en';try{var s=localStorage.getItem('wik-lang');if(s==='ko')l='ko';}catch(e){}document.documentElement.setAttribute('data-lang',l);document.documentElement.lang=l;})();`;
