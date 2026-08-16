import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AppIcon } from '@/components/AppIcon';
import { Dot } from '@/components/Dot';
import { RelativeTime } from '@/components/RelativeTime';
import { T, type Bi } from '@/lib/i18n';
import { getService, getServices } from '@/lib/data';
import { hasIcon } from '@/lib/icons';
import {
  CATEGORY_LABELS,
  HEADLINE_KEYS,
  type SignalView,
  measuredCount,
  viewAll,
} from '@/lib/present';
import { jsonLd, serviceDescription, serviceFaq } from '@/lib/seo';
import { SITE, ogImage } from '@/lib/site-config';
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

  // 106개가 같은 설명을 달고 있으면 검색엔진이 구분할 이유가 없고 사람도 누를 이유가 없다.
  // 실제로 잰 답을 넣는다 (lib/seo.ts).
  const path = `/service/${service.id}/`;
  return {
    title: `${service.name.en} (${service.name.ko}) — does it work for foreigners?`,
    description: serviceDescription(service),
    alternates: { canonical: path },
    openGraph: {
      title: `${service.name.en} — does it work for foreigners?`,
      description: serviceDescription(service),
      url: path,
      type: 'article',
      siteName: SITE.name,
      images: [{ ...ogImage(path), alt: `${service.name.en} — measured answers` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${service.name.en} — does it work for foreigners?`,
      description: serviceDescription(service),
      images: [{ ...ogImage(path), alt: `${service.name.en} — measured answers` }],
    },
  };
}

const CONFIDENCE: Record<string, Bi> = {
  auto: { en: 'measured by machine', ko: '자동 확인' },
  community: { en: 'reported by people', ko: '이용자 제보' },
  conflicting: { en: 'reports disagree', ko: '제보가 엇갈림' },
  unknown: { en: 'no value recorded', ko: '기록 없음' },
};

const AWAITING: Bi = { en: 'waiting for a first-hand report', ko: '제보 기다리는 중' };

/** 맨 위 요약 칸의 제목. 아래 기록의 긴 질문문을 그대로 쓰면 칸이 글자로 꽉 찬다. */
const GLANCE_LABEL: Record<string, Bi> = {
  overseas_access: { en: 'Opens from abroad', ko: '해외에서 접속' },
  i18n_ui: { en: 'Languages', ko: '쓸 수 있는 언어' },
  signup_phone_auth: { en: 'Sign-up', ko: '가입 조건' },
};

function ExternalIcon() {
  return (
    <svg
      className="ext"
      width="11"
      height="11"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4.5 2h5.5v5.5M10 2 5 7M8 9.5v.5H2V4h.5" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M11.05 8.5c-.02-1.6 1.31-2.37 1.37-2.41-.75-1.09-1.91-1.24-2.32-1.26-.99-.1-1.93.58-2.43.58-.5 0-1.27-.57-2.09-.55-1.07.02-2.06.62-2.61 1.58-1.12 1.94-.29 4.81.8 6.38.53.77 1.17 1.63 2 1.6.8-.03 1.1-.52 2.07-.52.96 0 1.24.52 2.09.5.86-.01 1.4-.78 1.93-1.55.61-.89.86-1.75.87-1.79-.02-.01-1.67-.64-1.68-2.56ZM9.5 3.78c.44-.53.73-1.27.65-2-.63.02-1.4.42-1.85.95-.4.47-.75 1.22-.66 1.94.7.05 1.42-.36 1.86-.89Z" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M2.4 1.6c-.2.21-.32.53-.32.95v10.9c0 .42.12.74.33.94l.05.05 6.1-6.1v-.14l-6.1-6.1-.06.05Zm8.15 4.13L8.52 3.7 3.03 1.34l7.52 4.39Zm0 4.54L3.03 14.66l5.49-5.49 2.03 2.03v-.93Zm.53-.31 1.9-1.11c.58-.34.58-.88 0-1.22l-1.9-1.11L9 8l2.08 1.96Z" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden
    >
      <circle cx="8" cy="8" r="6.2" />
      <path d="M1.8 8h12.4M8 1.8c1.6 1.7 2.5 3.9 2.5 6.2S9.6 12.5 8 14.2C6.4 12.5 5.5 10.3 5.5 8S6.4 3.5 8 1.8Z" />
    </svg>
  );
}

export default async function ServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = await getService(id);
  if (!service) notFound();

  const icon = await hasIcon(service.id);
  const views = viewAll(service);
  const glance = HEADLINE_KEYS.map((k) => views.find((v) => v.key === k)!).filter(Boolean);
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

  // 앱을 받으러 온 사람에게 스토어 주소를 다시 찾게 하지 않는다.
  // 앱 이름이 서비스 이름과 다른 경우가 흔해서(손택스·NOL 티켓·T world) 검색이 잘 안 된다.
  const iosId = typeof service.hints?.ios_app_id === 'string' ? service.hints.ios_app_id : null;
  const androidPkg =
    typeof service.hints?.android_package === 'string' ? service.hints.android_package : null;

  // 이 페이지는 말 그대로 질문과 답의 목록이다. 그대로 FAQPage 로 알린다.
  const faq = serviceFaq(service, `${SITE.url}/service/${service.id}/`);

  return (
    <>
      {faq !== null && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(faq) }}
        />
      )}

      <section className="record-head">
        <div className="wrap">
          <p className="breadcrumb">
            <Link href="/">
              <svg
                width="13"
                height="13"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M11 7H3M6.5 3.5 3 7l3.5 3.5" />
              </svg>
              <T en="All services" ko="전체 서비스" />
            </Link>
            <span aria-hidden>·</span>
            <T {...cat} />
          </p>

          <div className="record-title">
            <AppIcon id={service.id} name={service.name.en} has={icon} size={68} />
            <h1>
              {service.name.en}
              {service.name.ko !== service.name.en && <em>{service.name.ko}</em>}
            </h1>
          </div>

          <div className="record-meta">
            <span>
              <T
                en={`${recorded} of ${views.length} questions answered`}
                ko={`${views.length}개 항목 중 ${recorded}개 확인됨`}
              />
            </span>
            {lastMeasured && (
              <span>
                <T en="last checked" ko="마지막 확인" />
                <span className="mono">{formatUtc(lastMeasured)}</span>
                <RelativeTime iso={lastMeasured} />
              </span>
            )}
          </div>

          <div className="gotos">
            <a className="goto" href={service.url} rel="nofollow noreferrer" target="_blank">
              <GlobeIcon />
              {new URL(service.url).host}
              <ExternalIcon />
            </a>
            {iosId && (
              <a
                className="goto"
                href={`https://apps.apple.com/kr/app/id${iosId}`}
                rel="nofollow noreferrer"
                target="_blank"
              >
                <AppleIcon />
                <T en="App Store" ko="App Store" />
                <ExternalIcon />
              </a>
            )}
            {androidPkg && (
              <a
                className="goto"
                href={`https://play.google.com/store/apps/details?id=${androidPkg}`}
                rel="nofollow noreferrer"
                target="_blank"
              >
                <PlayIcon />
                <T en="Google Play" ko="Google Play" />
                <ExternalIcon />
              </a>
            )}
          </div>

          {/*
           * 세 개의 답을 먼저, 크게.
           *
           * 사람들은 이 페이지에 "되나 안 되나" 하나를 확인하러 온다. 그 답이 여덟 개의
           * 기록 사이 어딘가에 글로 섞여 있으면 읽어서 찾아야 한다. 위에 크게 세워 두면
           * 스크롤 전에 끝난다. 아래 기록은 "왜 그렇게 나왔나"를 보려는 사람 몫이다.
           *
           * "아직 확인 못 함"도 똑같이 큰 칸을 차지한다. 작게 줄이거나 빼면 모른다는
           * 사실이 화면에서 사라지고, 그건 이 사이트가 가진 유일한 자산이다. (D-12)
           */}
          <div className="verdict">
            {glance.map((v) => (
              <div key={v.key} className={`vcard t-${v.tone}`}>
                <p className="vcard-q">
                  <T {...(GLANCE_LABEL[v.key] ?? v.label)} />
                </p>
                <p className="vcard-a">
                  <Dot tone={v.tone} />
                  <span>
                    <T {...v.display} />
                  </span>
                </p>
              </div>
            ))}
          </div>

          {service.notes?.en && (
            <div className="aside mark" style={{ margin: '26px 0 0' }}>
              <T en={service.notes.en} ko={service.notes.ko ?? service.notes.en} />
            </div>
          )}
        </div>
      </section>

      <div className="wrap">
        {sharedKind && (
          <div className="aside warn" style={{ margin: '28px 0 0' }}>
            <h3>
              <T
                en={`${blockedViews.length} values are blank for the same reason`}
                ko={`${blockedViews.length}개 값이 같은 이유로 비어 있습니다`}
              />
            </h3>
            <T {...sharedKind} />
          </div>
        )}

        <div className="records">
          {views.map((v) => (
            <Record key={v.key} v={v} hideWhy={sharedKind !== null && blockedViews.includes(v)} />
          ))}
        </div>

        <p style={{ margin: '32px 0 72px', fontSize: 14.5, color: 'var(--text-3)' }}>
          <T
            en="Does a value here not match what you saw?"
            ko="여기 값이 직접 보신 것과 다른가요?"
          />{' '}
          <Link href="/report/" style={{ color: 'var(--accent)', fontWeight: 550 }}>
            <T en="Send a correction →" ko="정정 요청 보내기 →" />
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
      <div className="signal-head">
        <h2 className="signal-q">
          <T {...v.question} />
        </h2>
        <p className="signal-a">
          <Dot tone={v.tone} />
          <T {...v.display} />
        </p>
      </div>

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
                <T en="Checked" ko="확인" />
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
              <T en="Raw evidence" ko="수집한 원본 보기" />
            </summary>
            <pre>{JSON.stringify(v.evidence, null, 2)}</pre>
          </details>
        )}
      </div>
    </article>
  );
}
