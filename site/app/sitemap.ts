import type { MetadataRoute } from 'next';
import { getLatestRun, getServices } from '@/lib/data';
import { SITE } from '@/lib/site-config';

// output: export 에서는 이 두 파일도 빌드 시점에 확정돼야 한다.
export const dynamic = 'force-static';

/**
 * sitemap.xml — 서비스 106건까지 전부 넣는다.
 *
 * lastModified 는 빌드 시각이 아니라 **그 서비스가 마지막으로 측정된 시각**을 쓴다.
 * 이 사이트에서 "언제 갱신됐는가"는 페이지를 다시 그린 시각이 아니라 사실을 다시 확인한 시각이다.
 * 빌드 시각을 쓰면 내용이 그대로인데도 매일 전부 갱신된 것처럼 보고하게 된다.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [services, run] = await Promise.all([getServices(), getLatestRun()]);
  const runAt = run ? new Date(run.finished_at) : new Date();

  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE.url}/`, lastModified: runAt, changeFrequency: 'daily', priority: 1 },
    { url: `${SITE.url}/changes/`, lastModified: runAt, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE.url}/method/`, lastModified: runAt, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE.url}/api-docs/`, lastModified: runAt, changeFrequency: 'monthly', priority: 0.6 },
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
