import Link from 'next/link';
import { Explorer, type Row } from '@/components/Explorer';
import { RelativeTime } from '@/components/RelativeTime';
import { formatUtc } from '@/lib/time';
import {
  getBlockCounts,
  getBlockedServices,
  getCoverage,
  getLatestRun,
  getServices,
} from '@/lib/data';
import {
  BLOCK_LABELS,
  CATEGORY_LABELS,
  HEADLINE_KEYS,
  crawlBlock,
  measuredCount,
  viewSignal,
} from '@/lib/present';
import type { SignalKey } from '@/lib/types';

/** 카드 안에서만 쓰는 짧은 이름 (상세 페이지에는 온전한 질문이 나온다) */
const SHORT: Record<string, string> = {
  overseas_access: 'From abroad',
  i18n_ui: 'Languages',
  signup_phone_auth: 'Sign-up',
  support_en: 'Support',
};

const COVERAGE_LABELS: Record<SignalKey, string> = {
  overseas_access: 'Loads from abroad',
  i18n_ui: 'Interface languages',
  signup_phone_auth: 'Phone check to sign up',
  app_availability: 'Mobile apps listed',
  payment_gate: 'Payment gateways seen',
  support_en: 'English support stated',
  foreign_card: 'Foreign card works',
  foreign_phone_sms: 'SMS to foreign number',
};

export default async function HomePage() {
  const [services, run, coverage, blocked, counts] = await Promise.all([
    getServices(),
    getLatestRun(),
    getCoverage(),
    getBlockedServices(),
    getBlockCounts(),
  ]);

  // 이름을 손으로 적어 두면 시드가 바뀔 때 조용히 거짓이 된다. 데이터에서 뽑는다.
  const namedBlocked = blocked
    .filter((b) => b.service.importance === 1)
    .map((b) => b.service.name.en)
    .sort((a, b) => a.localeCompare(b, 'en'))
    .slice(0, 5);

  const rows: Row[] = services
    .map((s) => {
      const views = HEADLINE_KEYS.map((k) => viewSignal(s, k));
      return {
        id: s.id,
        nameEn: s.name.en,
        nameKo: s.name.ko,
        category: s.category,
        categoryEn: CATEGORY_LABELS[s.category]?.en ?? s.category,
        importance: s.importance,
        measured: measuredCount(s),
        total: 8,
        crawlBlocked: (() => {
          const k = crawlBlock(s);
          return k ? BLOCK_LABELS[k].en : null;
        })(),
        signals: views.map((v) => ({
          key: v.key,
          short: SHORT[v.key] ?? v.label.en,
          value: v.tone === 'none' ? 'not measured' : v.display.en,
          tone: v.tone,
        })),
        haystack: [s.name.en, s.name.ko, s.id, s.category, s.url].join(' ').toLowerCase(),
      };
    })
    // 중요도 먼저, 그다음 값이 많이 기록된 순.
    // 값이 없는 서비스를 감추는 게 아니라 (전부 목록에 있고 필터로 골라볼 수 있다),
    // 첫 화면이 "빈칸 벽"이 되면 데이터가 없는 사이트로 오해된다.
    .sort(
      (a, b) =>
        a.importance - b.importance ||
        b.measured - a.measured ||
        a.nameEn.localeCompare(b.nameEn, 'en'),
    );

  const totalValues = coverage.reduce((n, c) => n + c.measured, 0);
  const totalSlots = coverage.reduce((n, c) => n + c.total, 0);
  const categories: [string, string][] = Object.entries(CATEGORY_LABELS)
    .filter(([id]) => services.some((s) => s.category === id))
    .map(([id, bi]) => [id, bi.en]);

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <h1>Which Korean services actually work without a Korean phone, card, or ID?</h1>
          <p className="lede">
            {services.length} services, re-measured by machine every day. Every value below carries
            the moment it was taken, the method that produced it, and how much it should be trusted.
            Where we could not measure something, it says so — and why.
          </p>
          <p className="lede-ko">
            한국 온라인 서비스가 외국인에게 실제로 작동하는지를 매일 자동으로 측정합니다. 모든 값에
            측정 시각·측정 방법·신뢰도가 붙습니다. 모르는 것은 모른다고 적습니다.
          </p>

          <div className="stat-strip">
            <div className="stat">
              <b>{services.length}</b>
              <span>services tracked</span>
            </div>
            <div className="stat">
              <b>
                {totalValues}
                <span style={{ fontSize: 13, color: 'var(--faint)' }}>/{totalSlots}</span>
              </b>
              <span>values on record</span>
            </div>
            <div className="stat">
              <b style={{ fontSize: 15 }}>
                {run ? formatUtc(run.finished_at).replace(' UTC', '') : '—'}
              </b>
              <span>
                last measurement run{' '}
                {run && (
                  <>
                    · <RelativeTime iso={run.finished_at} />
                  </>
                )}
              </span>
            </div>
            <div className="stat">
              <b>{blocked.length}</b>
              <span>cannot be measured automatically</span>
            </div>
          </div>
        </div>
      </section>

      <Explorer rows={rows} categories={categories} />

      <section className="section">
        <div className="wrap">
          <h2>What we do not know</h2>
          <p className="sub">
            The bar shows how many of the {services.length} services have a recorded value for each
            question. Empty space is not an oversight — it is the honest state of the measurement.
            <br />
            <span style={{ color: 'var(--faint)' }}>
              빈칸은 누락이 아니라 측정 현황 그 자체입니다.
            </span>
          </p>

          <div className="cov">
            {coverage.map((c) => (
              <div className="cov-row" key={c.key}>
                <div className="cov-label">{COVERAGE_LABELS[c.key]}</div>
                <div className="cov-bar">
                  <i style={{ width: `${Math.round((c.measured / c.total) * 100)}%` }} />
                </div>
                <div className="cov-num">
                  {c.measured}/{c.total}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <h2>Two questions we will never answer with a robot</h2>
          <p className="sub">
            Whether a foreign card goes through, and whether a verification text reaches a non-Korean
            number, can only be established by actually paying and actually receiving a message. We do
            not automate either. Those two rows stay empty until a person who tried it tells us what
            happened.
            <br />
            <span style={{ color: 'var(--faint)' }}>
              해외 카드 결제와 해외 번호 SMS는 실제 결제·실제 인증 요청 없이는 확인할 수 없습니다.
              그것은 하지 않기로 한 일이라, 겪은 사람의 제보로만 채웁니다.
            </span>
          </p>

          <div className="notice">
            <strong>
              {blocked.length} of {services.length} services could not be measured automatically.
            </strong>{' '}
            These are five different situations and we do not lump them together — saying a company
            forbade something it did not forbid would be its own kind of false statement.
            <ul style={{ margin: '10px 0 0', paddingLeft: 18 }}>
              {(
                [
                  ['robots-disallow', 'tell crawlers to stay away in robots.txt, and we honour it'],
                  ['bot-block', 'answer our crawler with a refusal (HTTP 403/429)'],
                  ['unreachable', 'did not answer our request at all from outside Korea'],
                  ['tls', 'served a certificate chain we could not verify'],
                  ['robots-unreadable', 'have a robots.txt we could not read, so we stayed away'],
                ] as const
              )
                .map(([kind, text]) => [counts[kind], text, kind] as const)
                .filter(([n]) => n > 0)
                .map(([n, text, kind]) => (
                  <li key={kind} style={{ marginBottom: 3 }}>
                    <strong>{n}</strong> {text}
                  </li>
                ))}
            </ul>
            {namedBlocked.length > 0 && (
              <p style={{ margin: '10px 0 0' }}>
                {namedBlocked.join(', ')} are among them. For these, a first-hand report is not a
                supplement — it is the only source there is.
              </p>
            )}
            <p style={{ margin: '10px 0 0' }}>
              <Link href="/method/">How measurement works →</Link>
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
