'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_LANG, type Lang } from '@/lib/i18n';

/**
 * 지금 언어가 무엇인지 알아야만 하는 곳에서 쓴다 — placeholder, aria-label,
 * 정렬 기준처럼 **문자열을 값으로 넘겨야 하는** 자리다.
 * 화면에 그냥 보이는 문구는 <T> 를 써야 한다 (그쪽은 JS 없이도 동작한다).
 */
export function useLang(): Lang {
  const [lang, setLang] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    const root = document.documentElement;
    const read = (): void => {
      const v = root.getAttribute('data-lang');
      setLang(v === 'ko' ? 'ko' : 'en');
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ['data-lang'] });
    return () => observer.disconnect();
  }, []);

  return lang;
}
