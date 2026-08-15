import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RelativeTime } from '@/components/RelativeTime';
import { T, type Bi } from '@/lib/i18n';
import { getService, getServices } from '@/lib/data';
import { CATEGORY_LABELS, type SignalView, measuredCount, viewAll } from '@/lib/present';
import { formatUtc } from '@/lib/time';

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
    description: `Measured facts about ${service.name.en} (${service.name.ko}): access from abroad, interface languages, Korean phone verification at sign-up, and English support. Every value is timestamped and sourced.`,
  };
}

const CONFIDENCE: Record<string, Bi> = {
  auto: { en: 'measured by machine', ko: '기계가 측정' },
  community: { en: 'reported by people', ko: '사람이 제보' },
  conflicting: { en: 'reports disagree', ko: '제보가 엇갈림' },
  unknown: { en: 'no value recorded', ko: '값 없음' },
};

const AWAITING: Bi = { en: 'waiting for a first-hand report', ko: '직접 겪은 제보를 기다리는 중' };

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
  const cat = CATEGORY_LABELS[service.category] ?? {
    en: service.category,
    ko: service.category,
  };

  return (
    <>
      <section className="record-head">
        <div className="wrap">
          <p className="breadcrumb">
            <Link href="/">
              <T en="All services" ko="전체 서비스" />
            </Link>
            {' · '}
            <T {...cat} />
          </p>

          <h1>
            {service.name.en}
            {service.name.ko !== service.name.en && <em>{service.name.ko}</em>}
          </h1>

          <div className="record-meta">
            <span>
              <a href={service.url} rel="nofollow noreferrer" target="_blank">
                {new URL(service.url).host}
              </a>
            </span>
            <span>
              <T
                en={`${recorded} of ${views.length} signals have a value`}
                ko={`시그널 ${views.length}종 중 ${recorded}종에 값이 있음`}
              />
            </span>
            {lastMeasured && (
              <span>
                <T en="last checked" ko="마지막 확인" />{' '}
                <span className="mono">{formatUtc(lastMeasured)}</span>{' '}
                <RelativeTime iso={lastMeasured} />
              </span>
            )}
          </div>

          {service.notes?.en && (
            <div className="aside mark" style={{ marginBottom: 0 }}>
              <T en={service.notes.en} ko={service.notes.ko ?? service.notes.en} />
            </div>
          )}
        </div>
      </section>

      <div className="wrap">
        <div className="signals">
          {views.map((v) => (
            <Record key={v.key} v={v} />
          ))}
        </div>

        <div className="aside" style={{ margin: '30px 0 64px' }}>
          <h3>
            <T en="Is something here wrong?" ko="여기 틀린 내용이 있나요?" />
          </h3>
          <T
            en="Every value on this page is meant to be falsifiable — that is why the raw evidence sits underneath each one. If a value does not match what you experienced, say so and it will be corrected with its source recorded."
            ko="이 페이지의 모든 값은 반증 가능하도록 만들어져 있습니다. 각 값 아래에 원본 근거가 그대로 공개돼 있는 이유입니다. 겪은 것과 다르면 알려주세요. 근거와 함께 정정합니다."
          />
          <p style={{ marginTop: 14 }}>
            <Link className="button ghost" href="/report/">
              <T en="Send a correction" ko="정정 요청 보내기" />
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

function Record({ v }: { v: SignalView }) {
  const conf = CONFIDENCE[v.confidence] ?? CONFIDENCE.unknown!;

  return (
    <article className={`signal t-${v.tone}`}>
      <h2 className="signal-q">
        <T {...v.question} />
      </h2>

      <p className="signal-a">
        <T {...v.display} />
      </p>

      <div className="signal-body">
        {v.why && (
          <p className="signal-note">
            <T {...v.why} />
          </p>
        )}
        {v.caveat && (
          <p className="signal-note">
            <T {...v.caveat} />
          </p>
        )}

        <div className="stamp">
          <span className={`tag ${v.awaitingReport ? 'community' : v.confidence}`}>
            <T {...(v.awaitingReport ? AWAITING : conf)} />
          </span>
          <span>
            <b>
              <T en="Method" ko="방법" />
            </b>
            <T {...v.methodLabel} />
          </span>
          {!v.awaitingReport && (
            <span>
              <b>
                <T en="Measured" ko="측정" />
              </b>
              {v.measuredAt ? (
                <>
                  <span className="mono">{formatUtc(v.measuredAt)}</span>{' '}
                  <RelativeTime iso={v.measuredAt} />
                </>
              ) : (
                <T en="never" ko="없음" />
              )}
            </span>
          )}
          {v.lastChangedAt && (
            <span>
              <b>
                <T en="Changed" ko="변경" />
              </b>
              <span className="mono">{formatUtc(v.lastChangedAt)}</span>
            </span>
          )}
        </div>

        {v.evidence && Object.keys(v.evidence).length > 0 && (
          <details className="raw">
            <summary>
              <T
                en="Raw evidence — what the probe actually saw"
                ko="원본 근거 — 프로브가 실제로 본 것"
              />
            </summary>
            <pre>{JSON.stringify(v.evidence, null, 2)}</pre>
          </details>
        )}
      </div>
    </article>
  );
}
