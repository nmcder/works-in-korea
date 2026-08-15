import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RelativeTime } from '@/components/RelativeTime';
import { formatUtc } from '@/lib/time';
import { getService, getServices } from '@/lib/data';
import { CATEGORY_LABELS, type SignalView, measuredCount, viewAll } from '@/lib/present';

export const dynamicParams = false;

export async function generateStaticParams(): Promise<{ id: string }[]> {
  const services = await getServices();
  return services.map((s) => ({ id: s.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const service = await getService(id);
  if (!service) return { title: 'Not found' };
  return {
    title: `${service.name.en} — does it work for foreigners?`,
    description: `Measured facts about ${service.name.en} (${service.name.ko}): access from abroad, interface languages, Korean phone verification at sign-up, and English support. Each value is timestamped and sourced.`,
  };
}

const CONFIDENCE_LABEL: Record<string, { en: string; ko: string }> = {
  auto: { en: 'measured by machine', ko: '자동 측정' },
  community: { en: 'reported by people', ko: '커뮤니티 제보' },
  conflicting: { en: 'reports disagree', ko: '제보 엇갈림' },
  unknown: { en: 'no value recorded', ko: '값 없음' },
};

export default async function ServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = await getService(id);
  if (!service) notFound();

  const views = viewAll(service);
  const recorded = measuredCount(service);
  const lastMeasured = views
    .map((v) => v.measuredAt)
    .filter((t): t is string => Boolean(t))
    .sort()
    .at(-1);

  return (
    <>
      <section className="detail-head">
        <div className="wrap">
          <p className="crumb">
            <Link href="/">All services</Link> ·{' '}
            {CATEGORY_LABELS[service.category]?.en ?? service.category}
          </p>
          <h1>
            {service.name.en}
            {service.name.ko !== service.name.en && <span className="ko">{service.name.ko}</span>}
          </h1>
          <div className="detail-meta">
            <span>
              <a href={service.url} rel="nofollow noreferrer" target="_blank">
                {new URL(service.url).host}
              </a>
            </span>
            <span>
              {recorded} of {views.length} signals have a value
            </span>
            {lastMeasured && (
              <span>
                last checked <span className="mono">{formatUtc(lastMeasured)}</span> (
                <RelativeTime iso={lastMeasured} />)
              </span>
            )}
          </div>
          {service.notes?.en && (
            <div className="notice" style={{ marginTop: 16 }}>
              {service.notes.en}
              {service.notes.ko && (
                <>
                  <br />
                  <span style={{ color: 'var(--faint)' }}>{service.notes.ko}</span>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="wrap">
        <div className="signal-list">
          {views.map((v) => (
            <SignalBlock key={v.key} v={v} />
          ))}
        </div>

        <div className="notice" style={{ margin: '18px 0 48px' }}>
          <strong>Found something that is wrong?</strong> Every value here is falsifiable on purpose
          — the raw evidence is printed under each one. Send a correction to{' '}
          <a href="mailto:kkw5863@gmail.com">kkw5863@gmail.com</a> and it will be fixed with its
          source recorded.
          <br />
          <span style={{ color: 'var(--faint)' }}>
            사실과 다른 값을 발견하면 알려주세요. 각 값 아래에 원본 근거가 그대로 공개되어 있습니다.
          </span>
        </div>
      </div>
    </>
  );
}

function SignalBlock({ v }: { v: SignalView }) {
  const conf = CONFIDENCE_LABEL[v.confidence] ?? CONFIDENCE_LABEL.unknown!;

  return (
    <article className={`signal t-${v.tone}`}>
      <div className="signal-top">
        <div className="signal-q">
          {v.question.en}
          <span className="ko">{v.question.ko}</span>
        </div>
        <div className="signal-val">
          <span>
            {v.display.en}
            <span className="ko" style={{ display: 'block' }}>
              {v.display.ko}
            </span>
          </span>
        </div>
      </div>

      {v.why && (
        <p className="why">
          {v.why.en}
          <span className="ko">{v.why.ko}</span>
        </p>
      )}

      {v.caveat && (
        <p className="why">
          {v.caveat.en}
          <span className="ko">{v.caveat.ko}</span>
        </p>
      )}

      <div className="provenance">
        <span className={`badge ${v.awaitingReport ? 'community' : v.confidence}`}>
          {v.awaitingReport ? 'waiting for a first-hand report' : conf.en}
        </span>
        <span>
          <b>Method</b> {v.methodLabel.en}
        </span>
        {!v.awaitingReport && (
          <span>
            <b>Measured</b>{' '}
            {v.measuredAt ? (
              <>
                <span className="mono">{formatUtc(v.measuredAt)}</span>{' '}
                <RelativeTime iso={v.measuredAt} />
              </>
            ) : (
              'never'
            )}
          </span>
        )}
        {v.lastChangedAt && (
          <span>
            <b>Last changed</b> <span className="mono">{formatUtc(v.lastChangedAt)}</span>
          </span>
        )}
      </div>

      {v.evidence && Object.keys(v.evidence).length > 0 && (
        <details className="evidence">
          <summary>Raw evidence — what the probe actually saw</summary>
          <pre>{JSON.stringify(v.evidence, null, 2)}</pre>
        </details>
      )}
    </article>
  );
}
