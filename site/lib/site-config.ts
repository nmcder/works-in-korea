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
/**
 * 환경변수를 읽되 **빈 문자열은 미설정으로 본다.**
 *
 * ⚠️ Actions 도 Vercel 도 변수가 비어 있으면 undefined 가 아니라 빈 문자열을 준다.
 *  는 null/undefined 만 잡으므로 기본값이 무시된다. 2026-08-15 에 이 실수로
 * 모델 이름이 빈 채로 API 에 나가 하루치 분류가 통째로 날아갔다.
 */
function env(name: string, fallback: string): string {
  const raw = process.env[name]?.trim();
  return raw ? raw : fallback;
}

const ISSUES_REPO = env('NEXT_PUBLIC_ISSUES_REPO', '') || null;

/** ogImage() 가 SITE 보다 먼저 정의되므로 주소는 따로 꺼내 둔다 */
const SITE_URL = env('NEXT_PUBLIC_SITE_URL', 'https://www.worksinkorea.com');

export type ReportKind = 'foreign-card' | 'foreign-sms' | 'correction';

/** 이슈 폼 바로가기. 창구가 없으면 null 을 돌려준다 (링크를 만들지 않기 위해). */
export function reportUrl(kind: ReportKind): string | null {
  if (!ISSUES_REPO) return null;
  return `https://github.com/${ISSUES_REPO}/issues/new?template=${kind}.yml`;
}

/**
 * 공유 미리보기 그림의 주소.
 *
 * 여기서 Next 가 자동으로 넣는 주소를 덮어쓴다. 이유가 두 겹이다.
 *
 * 1. **끝의 슬래시.** 이 사이트는 `trailingSlash: true` 라서 `/opengraph-image` 는
 *    308 로 `/opengraph-image/` 에 넘어가는데, Next 가 자동으로 쓰는 주소에는
 *    슬래시가 없다. 미리보기 수집기는 이미지 주소의 리다이렉트를 따라가지 않는다.
 *
 * 2. **확장자.** 1번을 고쳐도 카카오톡에서는 여전히 안 떴다. 남은 차이는 주소가
 *    `.png` 로 끝나지 않고 폴더처럼 보인다는 것이다. 그래서 next.config.mjs 에
 *    `.png` 로 끝나는 주소를 rewrite 로 하나 더 달고, 여기서 그 주소를 쓴다.
 *
 * 둘 다 "그림이 있느냐"가 아니라 "저쪽이 그림으로 알아보느냐"의 문제였다.
 * 브라우저로 열면 언제나 잘 보이기 때문에 눈으로는 못 찾는다. 확인하는 법은
 * 빌드 결과 HTML 에서 og:image 값을 꺼내 `curl -I` 로 찍어 보는 것뿐이다.
 */
export interface OgImage {
  url: string;
  secureUrl: string;
  width: number;
  height: number;
  type: string;
}

export function ogImage(serviceId?: string): OgImage {
  const path = serviceId ? `/og/s/${serviceId}/image.png` : '/og/site.png';
  return {
    url: path,
    // og:image:secure_url 을 따로 보는 수집기가 있다. 절대 주소여야 한다.
    secureUrl: `${SITE_URL}${path}`,
    width: 1200,
    height: 630,
    type: 'image/png',
  };
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
  url: SITE_URL,

  issuesRepo: ISSUES_REPO,

  license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },

  contact: 'nmcder117@gmail.com',
} as const;
