import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site-config';

// output: export 에서는 이 두 파일도 빌드 시점에 확정돼야 한다.
export const dynamic = 'force-static';

/**
 * 우리 사이트의 robots.txt (우리가 남의 robots.txt를 지키는 것과는 별개다).
 *
 * 전면 허용한다. 검색엔진뿐 아니라 AI 크롤러도 막지 않는다 —
 * 정보성 질의는 대부분 클릭 없이 끝나므로(로드맵 리스크 표), 검색 유입보다
 * "AI가 인용할 수 있는 형태로 존재하는 것"이 현실적인 유통 경로다.
 * 데이터를 CC BY로 푼 것과 같은 이유이며, 막을 이유가 없다.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
