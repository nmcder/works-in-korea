/**
 * 사이트 상수. 도메인이나 제보 창구가 정해지면 여기만 고치면 된다.
 */
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
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://works-in-korea.vercel.app',

  /**
   * 제보 창구. 3주차에 공개 레포의 Issue Form 주소로 교체한다.
   * null 이면 UI가 "준비 중"으로 표시하고 링크를 걸지 않는다.
   */
  reportUrl: process.env.NEXT_PUBLIC_REPORT_URL ?? null,

  /** 데이터 라이선스 */
  license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },

  contact: 'kkw5863@gmail.com',
} as const;
