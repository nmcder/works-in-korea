import Link from 'next/link';
import { Explorer, type HeroStats, type Row } from '@/components/Explorer';
import { getBlockedServices, getLatestRun, getServices } from '@/lib/data';
import { T, TBlock, type Bi } from '@/lib/i18n';
import {
  CATEGORY_LABELS,
  HEADLINE_KEYS,
  crawlBlock,
  measuredCount,
  viewSignal,
} from '@/lib/present';
import { datasetSchema, jsonLd } from '@/lib/seo';
import { SITE } from '@/lib/site-config';
import { formatUtc } from '@/lib/time';

export const metadata = {
  alternates: { canonical: '/' },
};

const SHORT: Record<string, Bi> = {
  overseas_access: { en: 'From abroad', ko: '해외 접속' },
  i18n_ui: { en: 'Languages', ko: '언어' },
  signup_phone_auth: { en: 'Sign-up', ko: '가입' },
};

export default async function HomePage() {
  const [services, run, blocked] = await Promise.all([
    getServices(),
    getLatestRun(),
    getBlockedServices(),
  ]);

  const rows: Row[] = services
    .map((s) => ({
      id: s.id,
      nameEn: s.name.en,
      nameKo: s.name.ko,
      category: s.category,
      cat: CATEGORY_LABELS[s.category] ?? { en: s.category, ko: s.category },
      importance: s.importance,
      measured: measuredCount(s),
      total: 8,
      blocked: crawlBlock(s) ? { en: 'blocked', ko: '차단' } : null,
      signals: HEADLINE_KEYS.map((k) => viewSignal(s, k)).map((v) => ({
        key: v.key,
        short: SHORT[v.key] ?? v.label,
        value: v.tone === 'none' ? { en: 'Not checked yet', ko: '아직 확인 못 함' } : v.display,
        tone: v.tone,
      })),
      haystack: [s.name.en, s.name.ko, s.id, s.category, s.url].join(' ').toLowerCase(),
    }))
    // 중요도 먼저, 그다음 값이 많은 순. 전부 목록에 있고 걸러 볼 수 있으므로
    // 감추는 것이 아니며, 첫 화면이 빈칸으로 덮이는 것을 막는다. (D-12)
    .sort(
      (a, b) =>
        a.importance - b.importance ||
        b.measured - a.measured ||
        a.nameEn.localeCompare(b.nameEn, 'en'),
    );

  const categories: [string, Bi][] = Object.entries(CATEGORY_LABELS).filter(([id]) =>
    services.some((s) => s.category === id),
  );

  const stats: HeroStats = {
    services: services.length,
    blocked: blocked.length,
    lastChecked: run ? formatUtc(run.finished_at).slice(0, 10) : null,
    vantage: run?.vantage_point.country
      ? [run.vantage_point.country.toUpperCase(), run.vantage_point.region]
          .filter(Boolean)
          .join(' · ')
      : null,
  };

  /*
   * 이 사이트는 그 자체로 공개 데이터셋이다. Dataset 스키마를 붙이면
   * Google Dataset Search 에 잡힌다. 이 프로젝트에 잘 맞는 통로다 —
   * 데이터셋으로 찾아오는 사람은 재사용할 사람이고, 재사용하는 사람이 보내는
   * 정정이 가장 정확하다.
   */
  const dataset = datasetSchema({
    url: SITE.url,
    services: services.length,
    modified: run?.finished_at ?? null,
    license: SITE.license.url,
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(dataset) }} />

      <Explorer rows={rows} categories={categories} stats={stats} />

      <section className="band">
        <div className="wrap">
          <h2 className="band-title">
            <T en="Two things we cannot check" ko="확인할 수 없는 두 가지" />
          </h2>
          <TBlock
            className="band-lede"
            en="Whether a foreign card goes through, and whether a verification code reaches a foreign number. Both need someone to actually try it. If you have, tell us and we will add it."
            ko="해외 카드로 결제가 되는지, 인증번호가 해외 번호로 오는지. 둘 다 직접 해봐야 알 수 있습니다. 해보셨다면 알려주세요."
          />
          <p>
            <Link className="button" href="/report/">
              <T en="Tell us what happened" ko="겪은 일 제보하기" />
            </Link>
          </p>

          <p style={{ marginTop: 26, fontSize: 14.5, color: 'var(--text-3)' }}>
            <T
              en={`${blocked.length} of the ${services.length} sites block automated checks, so those stay empty until someone reports.`}
              ko={`${services.length}개 중 ${blocked.length}개는 자동 확인을 막아 둬서, 제보가 올 때까지 비어 있습니다.`}
            />{' '}
            <Link href="/method/" style={{ color: 'var(--accent)', fontWeight: 550 }}>
              <T en="How we check →" ko="확인 방법 →" />
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
