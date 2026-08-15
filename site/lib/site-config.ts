/**
 * 사이트 상수. 도메인이나 제보 창구가 정해지면 여기만 고치면 된다.
 */

/**
 * 제보 이슈를 받는 **공개** 레포 (`소유자/이름`).
 *
 * null 이면 /report 페이지가 "준비 중"으로 표시되고 폼 링크를 걸지 않는다.
 *
 * 왜 별도 레포인가: 코드 레포는 프라이빗이고(D-3), 프라이빗 레포에는 외부인이
 * 이슈를 열 수 없다. 그런데 제보는 외부인이 하는 것이다. 그래서 하이브리드 —
 * 코드는 비공개, **데이터와 제보 창구는 공개** — 를 위해 공개 레포가 하나 필요하다.
 * 운영자가 만들고 나면 여기 이름만 넣으면 UI가 붙는다.
 */
const ISSUES_REPO = process.env.NEXT_PUBLIC_ISSUES_REPO ?? null;

export type ReportKind = 'foreign-card' | 'foreign-sms' | 'correction';

/** 이슈 폼 바로가기. 창구가 없으면 null 을 돌려준다 (링크를 만들지 않기 위해). */
export function reportUrl(kind: ReportKind): string | null {
  if (!ISSUES_REPO) return null;
  return `https://github.com/${ISSUES_REPO}/issues/new?template=${kind}.yml`;
}

export const SITE = {
  name: 'Works in Korea?',
  tagline: {
    en: 'Do Korean online services actually work for foreigners?',
    ko: '한국 온라인 서비스는 외국인에게 실제로 작동하는가?',
  },

  /**
   * 공개 주소. sitemap·robots·OG 카드에 쓰인다.
   * 자체 도메인이 생기면 Vercel 환경변수 NEXT_PUBLIC_SITE_URL 로 덮어쓴다.
   */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://worksinkorea.com',

  issuesRepo: ISSUES_REPO,

  license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },

  contact: 'nmcder117@gmail.com',
} as const;
