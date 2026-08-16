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

export type ReportKind = 'foreign-card' | 'foreign-sms' | 'correction';

/** 이슈 폼 바로가기. 창구가 없으면 null 을 돌려준다 (링크를 만들지 않기 위해). */
export function reportUrl(kind: ReportKind): string | null {
  if (!ISSUES_REPO) return null;
  return `https://github.com/${ISSUES_REPO}/issues/new?template=${kind}.yml`;
}

/**
 * 공유 미리보기 그림의 주소를 만든다.
 *
 * ⚠️ 끝의 슬래시가 핵심이다. 이 사이트는 `trailingSlash: true` 로 빌드되므로
 * `/opengraph-image` 로 요청하면 서버가 **308 로 `/opengraph-image/` 에 넘긴다.**
 * 그런데 Next 가 og:image 태그에 자동으로 넣는 주소에는 슬래시가 없다.
 *
 * 카카오톡·페이스북의 미리보기 수집기는 이미지 주소의 리다이렉트를 따라가지 않는다.
 * 그래서 그림 파일이 멀쩡히 있는데도(69KB PNG, 200 OK) 링크에 회색 상자만 떴다.
 * 2026-08-16 에 실제로 그랬다. 여기서 주소를 직접 적어 자동 생성을 덮어쓴다.
 */
export function ogImage(path: string): {
  url: string;
  width: number;
  height: number;
  type: string;
} {
  const clean = path.endsWith('/') ? path : `${path}/`;
  return { url: `${clean}opengraph-image/`, width: 1200, height: 630, type: 'image/png' };
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
  url: env('NEXT_PUBLIC_SITE_URL', 'https://www.worksinkorea.com'),

  issuesRepo: ISSUES_REPO,

  license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },

  contact: 'nmcder117@gmail.com',
} as const;
