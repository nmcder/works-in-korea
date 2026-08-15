'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_LANG, type Lang } from '@/lib/i18n';

/**
 * 언어 전환 버튼.
 *
 * 실제 전환은 <html data-lang> 을 바꾸는 것뿐이다 — 문구는 이미 양쪽 다 DOM에 있고
 * CSS가 한쪽만 보여준다. 그래서 리렌더도, 페이지 이동도, 깜빡임도 없다.
 */
export function LangToggle() {
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);

  // 서버 HTML은 항상 기본값으로 그려진다. 실제 선택은 <head> 인라인 스크립트가
  // 이미 반영해 두었으므로, 여기서는 버튼 표시를 실제 상태에 맞추기만 한다.
  useEffect(() => {
    const current = document.documentElement.getAttribute('data-lang');
    if (current === 'ko' || current === 'en') setLang(current);
  }, []);

  const choose = (next: Lang): void => {
    setLang(next);
    document.documentElement.setAttribute('data-lang', next);
    document.documentElement.lang = next;
    try {
      localStorage.setItem('wik-lang', next);
    } catch {
      /* 시크릿 모드 등에서 저장이 막혀도 전환 자체는 동작해야 한다 */
    }
  };

  return (
    <div className="lang" role="group" aria-label="Language / 언어">
      <button
        type="button"
        onClick={() => choose('en')}
        aria-pressed={lang === 'en'}
        lang="en"
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => choose('ko')}
        aria-pressed={lang === 'ko'}
        lang="ko"
      >
        한국어
      </button>
    </div>
  );
}
