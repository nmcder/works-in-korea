import Link from 'next/link';
import { Explorer, type Row } from '@/components/Explorer';
import { RelativeTime } from '@/components/RelativeTime';
import {
  getBlockCounts,
  getBlockedServices,
  getCoverage,
  getLatestRun,
  getServices,
} from '@/lib/data';
import { T, TBlock, type Bi } from '@/lib/i18n';
import {
  BLOCK_LABELS,
  CATEGORY_LABELS,
  HEADLINE_KEYS,
  crawlBlock,
  measuredCount,
  viewSignal,
} from '@/lib/present';
import { formatUtc } from '@/lib/time';
import type { SignalKey } from '@/lib/types';

const SHORT: Record<string, Bi> = {
  overseas_access: { en: 'From abroad', ko: '해외 접속' },
  i18n_ui: { en: 'Languages', ko: '언어' },
  signup_phone_auth: { en: 'Sign-up', ko: '가입' },
};

const COVERAGE_LABELS: Record<SignalKey, Bi> = {
  overseas_access: { en: 'Loads from abroad', ko: '해외에서 열림' },
  i18n_ui: { en: 'Interface languages', ko: '인터페이스 언어' },
  signup_phone_auth: { en: 'Phone check to sign up', ko: '가입 시 본인인증' },
  app_availability: { en: 'Mobile apps listed', ko: '앱 등록 여부' },
  payment_gate: { en: 'Payment gateways seen', ko: '탐지된 결제사' },
  support_en: { en: 'English support stated', ko: '영어 지원 명시' },
  foreign_card: { en: 'Foreign card works', ko: '해외 카드 결제' },
  foreign_phone_sms: { en: 'SMS to foreign number', ko: '해외 번호 SMS' },
};

const BLOCK_EXPLAIN: { kind: keyof Awaited<ReturnType<typeof getBlockCounts>>; text: Bi }[] = [
  {
    kind: 'robots-disallow',
    text: {
      en: 'tell crawlers to stay away in robots.txt, and we honour that',
      ko: 'robots.txt로 크롤러를 막고 있고, 우리는 그것을 지킨다',
    },
  },
  {
    kind: 'bot-block',
    text: {
      en: 'answer our crawler with a refusal (HTTP 403 or 429)',
      ko: '크롤러에게 거부 응답(HTTP 403·429)을 돌려준다',
    },
  },
  {
    kind: 'unreachable',
    text: {
      en: 'did not answer our request at all from outside Korea',
      ko: '한국 밖에서 보낸 요청에 아예 응답하지 않았다',
    },
  },
  {
    kind: 'tls',
    text: {
      en: 'served a certificate chain we could not verify',
      ko: '검증할 수 없는 인증서 체인을 내려줬다',
    },
  },
  {
    kind: 'robots-unreadable',
    text: {
      en: 'have a robots.txt we could not read, so we stayed away',
      ko: 'robots.txt를 읽지 못해 접근하지 않았다',
    },
  },
];

export default async function HomePage() {
  const [services, run, coverage, blocked, counts] = await Promise.all([
    getServices(),
    getLatestRun(),
    getCoverage(),
    getBlockedServices(),
    getBlockCounts(),
  ]);

  // 이름을 손으로 적어 두면 시드가 바뀔 때 조용히 거짓이 된다. 데이터에서 뽑는다.
  const named = blocked
    .filter((b) => b.service.importance === 1)
    .map((b) => b.service.name.en)
    .sort((a, b) => a.localeCompare(b, 'en'))
    .slice(0, 5);

  const rows: Row[] = services
    .map((s) => {
      const block = crawlBlock(s);
      return {
        id: s.id,
        nameEn: s.name.en,
        nameKo: s.name.ko,
        category: s.category,
        cat: CATEGORY_LABELS[s.category] ?? { en: s.category, ko: s.category },
        importance: s.importance,
        measured: measuredCount(s),
        total: 8,
        blocked: block ? BLOCK_LABELS[block] : null,
        signals: HEADLINE_KEYS.map((k) => viewSignal(s, k)).map((v) => ({
          key: v.key,
          short: SHORT[v.key] ?? v.label,
          value: v.tone === 'none' ? { en: 'not measured', ko: '측정 안 됨' } : v.display,
          tone: v.tone,
        })),
        haystack: [s.name.en, s.name.ko, s.id, s.category, s.url].join(' ').toLowerCase(),
      };
    })
    // 중요도 먼저, 그다음 값이 많이 기록된 순. 감추는 것이 아니라 (전부 목록에 있고
    // 필터로 골라볼 수 있다) 첫 화면이 빈칸 벽이 되는 것을 막는 것이다. (D-12)
    .sort(
      (a, b) =>
        a.importance - b.importance ||
        b.measured - a.measured ||
        a.nameEn.localeCompare(b.nameEn, 'en'),
    );

  const recorded = coverage.reduce((n, c) => n + c.measured, 0);
  const slots = coverage.reduce((n, c) => n + c.total, 0);
  const categories: [string, Bi][] = Object.entries(CATEGORY_LABELS).filter(([id]) =>
    services.some((s) => s.category === id),
  );

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <h1>
            <T
              en="Which Korean services actually work without a Korean phone, card, or ID?"
              ko="한국 서비스 중 어디가 한국 휴대폰·카드·신분증 없이 실제로 되는가?"
            />
          </h1>

          <TBlock
            className="standfirst"
            en={`${services.length} services, re-measured from outside Korea every day. Every value is stamped with when it was taken and how. Where we could not measure, it says so.`}
            ko={`${services.length}개 서비스를 매일 한국 밖에서 다시 측정합니다. 모든 값에 측정 시각과 방법이 붙고, 재지 못한 것은 재지 못했다고 적습니다.`}
          />

          <div className="figures">
            <div className="figure">
              <b>{services.length}</b>
              <span>
                <T en="services tracked" ko="추적 중인 서비스" />
              </span>
            </div>
            <div className="figure">
              <b>
                {recorded}
                <small>/{slots}</small>
              </b>
              <span>
                <T en="values on record" ko="기록된 값" />
              </span>
            </div>
            <div className="figure">
              <b style={{ fontSize: '1.02rem', letterSpacing: '-0.02em' }}>
                {run ? formatUtc(run.finished_at).replace(' UTC', '') : '—'}
              </b>
              <span>
                <T en="last measured" ko="마지막 측정" />
                {run && <RelativeTime iso={run.finished_at} before=" · " />}
              </span>
            </div>
            <div className="figure">
              <b>{run?.vantage_point.country?.toUpperCase() ?? '—'}</b>
              <span>
                <T
                  en={`measured from${run?.vantage_point.region ? ` ${run.vantage_point.region}` : ''}`}
                  ko={`측정한 곳${run?.vantage_point.region ? ` · ${run.vantage_point.region}` : ''}`}
                />
              </span>
            </div>
            <div className="figure">
              <b>{blocked.length}</b>
              <span>
                <T en="cannot be measured by machine" ko="자동 측정 불가" />
              </span>
            </div>
          </div>
        </div>
      </section>

      <Explorer rows={rows} categories={categories} />

      <section className="band">
        <div className="wrap">
          <h2 className="band-title">
            <T en="What is missing, and why" ko="무엇이 비어 있고, 왜인가" />
          </h2>
          <TBlock
            className="band-lede"
            en="Blank is not an oversight. It is either something a machine cannot establish, or something a site will not let us read."
            ko="빈칸은 누락이 아닙니다. 기계가 확인할 수 없는 것이거나, 사이트가 읽지 못하게 막은 것입니다."
          />

          <div className="coverage">
            {coverage.map((c) => (
              <div className="cov" key={c.key}>
                <span>
                  <T {...(COVERAGE_LABELS[c.key] as Bi)} />
                </span>
                <span className="cov-track">
                  <i style={{ width: `${Math.round((c.measured / c.total) * 100)}%` }} />
                </span>
                <span className="cov-n">
                  {c.measured}/{c.total}
                </span>
              </div>
            ))}
          </div>

          <h3 style={{ margin: '38px 0 12px', fontSize: '1.05rem' }}>
            <T
              en={`${blocked.length} services a machine cannot measure`}
              ko={`기계로 잴 수 없는 ${blocked.length}개 서비스`}
            />
          </h3>
          <table className="datatable" style={{ maxWidth: 620 }}>
            <tbody>
              {BLOCK_EXPLAIN.filter((b) => counts[b.kind] > 0).map((b) => (
                <tr key={b.kind}>
                  <td className="mono">{counts[b.kind]}</td>
                  <td>
                    <T {...b.text} />
                  </td>
                </tr>
              ))}
              <tr>
                <td className="mono">2</td>
                <td>
                  <T
                    en="questions no robot can answer — whether a foreign card clears, and whether a code reaches a foreign number"
                    ko="로봇이 답할 수 없는 질문 — 해외 카드가 실제로 결제되는지, 인증번호가 해외 번호에 도착하는지"
                  />
                </td>
              </tr>
            </tbody>
          </table>

          <p style={{ fontSize: 14.5, color: 'var(--ink-3)', maxWidth: '56ch' }}>
            {named.length > 0 && (
              <>
                <T
                  en={`${named.join(', ')} are among them. `}
                  ko={`${named.join(', ')} 등이 여기 해당합니다. `}
                />
              </>
            )}
            <T
              en="For these, a first-hand report is the only source there is."
              ko="이들에게는 직접 겪은 사람의 제보가 유일한 데이터원입니다."
            />{' '}
            <Link href="/report/" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
              <T en="Report something" ko="제보하기" />
            </Link>
            {' · '}
            <Link href="/method/" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
              <T en="How this is measured" ko="측정 방법" />
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
