import type { MetadataRoute } from 'next';
import { getLatestRun, getServices } from '@/lib/data';
import { SITE } from '@/lib/site-config';

// output: export 에서는 이 두 파일도 빌드 시점에 확정돼야 한다.
export const dynamic = 'force-static';

/**
 * sitemap.xml — 서비스 106건까지 전부 넣는다.
 *
 * ── lastModified 를 두 갈래로 쓴다
 *
 * **서비스 페이지**는 그 서비스가 마지막으로 측정된 시각을 쓴다. 이 사이트에서
 * "갱신됐다" 는 페이지를 다시 그린 것이 아니라 사실을 다시 확인한 것이다.
 * 빌드 시각을 쓰면 값이 그대로인 페이지까지 매일 바뀐 것처럼 신고하게 되고,
 * 그런 사이트맵은 검색엔진이 곧 믿지 않는다.
 *
 * **사이트 자체의 페이지**(홈·변경 기록·확인 방법·데이터·llms.txt)는 빌드 시각을 쓴다.
 * 이들은 측정값뿐 아니라 **사이트 코드가 바뀔 때도 내용이 바뀌기 때문**이다.
 * 2026-08-17 에 실제로 어긋났다 — 홈에 서비스 링크 82개를 새로 넣었는데,
 * 그날 측정이 전날 밤에 끝나 있어서 사이트맵은 "어제 이후 안 바뀜" 이라고 말하고 있었다.
 * 바뀐 것을 안 바뀌었다고 신고하면 다시 와서 볼 이유를 우리 손으로 없애는 셈이다.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [services, run] = await Promise.all([getServices(), getLatestRun()]);
  const runAt = run ? new Date(run.finished_at) : new Date();
  // 이 파일이 만들어지는 시각 = 이 배포의 시각. 코드가 바뀌면 여기서만 움직인다.
  const builtAt = new Date();

  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE.url}/`, lastModified: builtAt, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE.url}/changes/`, lastModified: builtAt, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE.url}/method/`, lastModified: builtAt, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE.url}/api-docs/`, lastModified: builtAt, changeFrequency: 'monthly', priority: 0.6 },
    /*
     * llms.txt 도 넣는다. 이 파일은 어디에서도 링크되지 않아 사실상 주소를 아는
     * 사람만 열 수 있었다 — robots.txt 에도 sitemap 에도 <link> 에도 없었다.
     * 통째로 인용되라고 만든 파일이 발견되지 않으면 만든 값어치가 없다.
     */
    { url: `${SITE.url}/llms.txt`, lastModified: builtAt, changeFrequency: 'daily', priority: 0.5 },
    /*
     * 제보 페이지가 빠져 있었다. 자동 확인이 영원히 닿지 못하는 값을 채우는 유일한
     * 길이고, "korea report foreign card not working" 같은 검색과도 맞는 페이지다.
     */
    { url: `${SITE.url}/report/`, lastModified: builtAt, changeFrequency: 'monthly', priority: 0.6 },
  ];

  for (const s of services) {
    const measured = Object.values(s.signals)
      .map((sig) => sig?.measured_at)
      .filter((t): t is string => Boolean(t))
      .sort()
      .at(-1);
    pages.push({
      url: `${SITE.url}/service/${s.id}/`,
      lastModified: measured ? new Date(measured) : runAt,
      changeFrequency: 'daily',
      priority: s.importance === 1 ? 0.9 : s.importance === 2 ? 0.7 : 0.5,
    });
  }

  return pages;
}
