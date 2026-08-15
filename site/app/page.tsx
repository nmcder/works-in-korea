import Link from 'next/link';
import { Explorer, type Row } from '@/components/Explorer';
import { RelativeTime } from '@/components/RelativeTime';
import { getBlockedServices, getLatestRun, getServices } from '@/lib/data';
import { T, TBlock, type Bi } from '@/lib/i18n';
import {
  CATEGORY_LABELS,
  HEADLINE_KEYS,
  crawlBlock,
  measuredCount,
  viewSignal,
} from '@/lib/present';
import { formatUtc } from '@/lib/time';

const SHORT: Record<string, Bi> = {
  overseas_access: { en: 'Opens from abroad', ko: '해외 접속' },
  i18n_ui: { en: 'Languages', ko: '언어' },
  signup_phone_auth: { en: 'Signing up', ko: '가입' },
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
    // 중요도 먼저, 그다음 값이 많은 순. 전부 목록에 있고 필터로 골라볼 수 있으므로
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

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <h1>
            <T
              en="Will this Korean site work for you?"
              ko="이 한국 서비스, 외국인도 쓸 수 있나요?"
            />
          </h1>

          <TBlock
            className="standfirst"
            en={`Checked every day from outside Korea: can you open it, what languages it offers, and whether signing up needs a Korean phone number. ${services.length} services.`}
            ko={`서비스 ${services.length}개를 한국 밖에서 매일 확인합니다. 접속이 되는지, 어떤 언어를 쓸 수 있는지, 가입할 때 한국 휴대폰이 필요한지.`}
          />

          <div className="figures">
            <div className="figure">
              <b>{services.length}</b>
              <span>
                <T en="services" ko="서비스" />
              </span>
            </div>
            <div className="figure">
              <b style={{ fontSize: '1.02rem', letterSpacing: '-0.02em' }}>
                {run ? formatUtc(run.finished_at).slice(0, 10) : '—'}
              </b>
              <span>
                <T en="last checked" ko="마지막 확인" />
                {run && <RelativeTime iso={run.finished_at} before=" · " />}
              </span>
            </div>
            <div className="figure">
              <b>{run?.vantage_point.country?.toUpperCase() ?? '—'}</b>
              <span>
                <T
                  en={`checked from${run?.vantage_point.region ? ` ${run.vantage_point.region}` : ''}`}
                  ko={`확인한 곳${run?.vantage_point.region ? ` · ${run.vantage_point.region}` : ''}`}
                />
              </span>
            </div>
          </div>
        </div>
      </section>

      <Explorer rows={rows} categories={categories} />

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

          <p style={{ marginTop: 26, fontSize: 14, color: 'var(--ink-3)' }}>
            <T
              en={`${blocked.length} of the ${services.length} sites refuse automated checks, so those rows stay empty until someone reports.`}
              ko={`${services.length}개 중 ${blocked.length}개는 자동 확인을 막아 둬서, 제보가 올 때까지 비어 있습니다.`}
            />{' '}
            <Link href="/method/" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
              <T en="How we check" ko="확인 방법" />
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
