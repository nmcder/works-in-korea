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
  auto: { en: 'measured by machine', ko: '자동 확인' },
  community: { en: 'reported by people', ko: '이용자 제보' },
  conflicting: { en: 'reports disagree', ko: '제보가 엇갈림' },
  unknown: { en: 'no value recorded', ko: '기록 없음' },
};

const AWAITING: Bi = { en: 'waiting for a first-hand report', ko: '제보 기다리는 중' };

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

  /**
   * 크롤러가 사이트 자체에 닿지 못하면 시그널 대여섯 개가 **같은 이유로** 전부 빈다.
   * 그걸 항목마다 반복해서 쓰면 같은 문장이 한 페이지에 여섯 번 나오고, 읽는 사람은
   * 그게 여섯 개의 다른 사실인 줄 알게 된다. 사실은 하나다 — 한 번만 쓴다.
   */
  const CRAWL_KINDS = ['robots', 'bot-block', 'unreachable', 'tls', 'robots-unreadable'];
  const blockedViews = views.filter((v) => v.why && CRAWL_KINDS.includes(v.why.kind));
  const sharedKind =
    blockedViews.length >= 3 && blockedViews.every((v) => v.why!.kind === blockedViews[0]!.why!.kind)
      ? blockedViews[0]!.why!
      : null;
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
                en={`${recorded} of ${views.length} questions answered`}
                ko={`${views.length}개 항목 중 ${recorded}개 확인됨`}
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
        {sharedKind && (
          <div className="aside warn" style={{ margin: '26px 0 0' }}>
            <h3>
              <T
                en={`${blockedViews.length} values are blank for the same reason`}
                ko={`${blockedViews.length}개 값이 같은 이유로 비어 있습니다`}
              />
            </h3>
            <T {...sharedKind} />
          </div>
        )}

        <div className="signals">
          {views.map((v) => (
            <Record key={v.key} v={v} hideWhy={sharedKind !== null && blockedViews.includes(v)} />
          ))}
        </div>

        <p style={{ margin: '26px 0 64px', fontSize: 14.5, color: 'var(--ink-3)' }}>
          <T
            en="Does a value here not match what you saw?"
            ko="여기 값이 직접 보신 것과 다른가요?"
          />{' '}
          <Link href="/report/" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
            <T en="Send a correction" ko="정정 요청 보내기" />
          </Link>
        </p>
      </div>
    </>
  );
}

function Record({ v, hideWhy }: { v: SignalView; hideWhy?: boolean }) {
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
        {v.why && !hideWhy && (
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
                <T en="Measured" ko="확인" />
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
                en="Raw evidence"
                ko="수집한 원본 보기"
              />
            </summary>
            <pre>{JSON.stringify(v.evidence, null, 2)}</pre>
          </details>
        )}
      </div>
    </article>
  );
}
