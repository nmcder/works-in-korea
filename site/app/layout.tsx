import type { Metadata } from 'next';
import Link from 'next/link';
import { LangToggle } from '@/components/LangToggle';
import { LANG_BOOTSTRAP, T } from '@/lib/i18n';
import { SITE, ogImage } from '@/lib/site-config';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — ${SITE.tagline.en}`,
    template: `%s · ${SITE.name}`,
  },
  description:
    'An open, machine-measured database of whether Korean online services work for people without a Korean phone number, Korean card, or Korean address. Every value carries the time it was measured, how, and how confident we are.',
  openGraph: {
    title: SITE.name,
    description: SITE.tagline.en,
    type: 'website',
    locale: 'en_US',
    siteName: SITE.name,
    url: '/',
    images: [{ ...ogImage(), alt: SITE.tagline.en }],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE.name,
    description: SITE.tagline.en,
    images: [{ ...ogImage(), alt: SITE.tagline.en }],
  },
  robots: { index: true, follow: true },

  /*
   * 검색엔진 소유 확인 코드. 비밀이 아니다 — 어차피 HTML 에 그대로 실린다.
   * 환경변수로 받는 이유는 코드에 박아 두면 나중에 도메인이 바뀌었을 때
   * 왜 여기 이런 문자열이 있는지 아무도 모르게 되기 때문이다.
   *
   * Google Search Console → 속성 추가 → HTML 태그 방식에서 content 값만 넣는다.
   * Vercel 환경변수 NEXT_PUBLIC_GOOGLE_VERIFICATION 에 넣고 재배포하면 붙는다.
   */
  verification: {
    ...(process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION?.trim()
      ? { google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION.trim() }
      : {}),
    ...(process.env.NEXT_PUBLIC_NAVER_VERIFICATION?.trim()
      ? { other: { 'naver-site-verification': process.env.NEXT_PUBLIC_NAVER_VERIFICATION.trim() } }
      : {}),
  },
};

const NAV = [
  { href: '/', en: 'Services', ko: '서비스' },
  { href: '/changes/', en: 'Changes', ko: '변경 기록' },
  { href: '/method/', en: 'Method', ko: '확인 방법' },
  { href: '/report/', en: 'Report', ko: '제보' },
  { href: '/api-docs/', en: 'Data', ko: '데이터' },
];

/*
 * 방문자 수 세기 (Cloudflare Web Analytics).
 *
 * 왜 필요한가: 이 사이트가 열리는지 아무도 몰랐다. Search Console 은 **구글 검색으로
 * 들어온 사람**만 보여주므로, 레딧이나 카톡 링크로 들어온 사람은 통째로 안 잡힌다.
 * 홍보를 시작하는데 반응이 있었는지 없었는지 모르면 홍보를 고칠 수가 없다.
 *
 * 왜 하필 이것인가: 쿠키도 localStorage 도 쓰지 않고, IP 를 저장하지 않는다
 * (국가만 계산하고 버린다). 그래서 동의 배너가 필요 없고, 개인정보보호법이
 * 문제 삼을 저장물이 생기지 않는다 — 1인 운영자에게 이 점이 결정적이다.
 *
 * ⚠️ 이걸 붙이면서 푸터 문구를 "추적도 없고" → "쿠키도 없고" 로 바꿨고,
 * /method 에 무엇을 세는지 적었다. 세면서 안 센다고 적어 두면, 이 사이트가 가진
 * 단 하나의 자산(적힌 대로다)이 무너진다. 셋은 항상 같이 간다.
 *
 * 토큰이 없으면 아무것도 그리지 않는다 — 로컬과 미리보기 배포에는 안 붙는다.
 */
const CF_BEACON = process.env.NEXT_PUBLIC_CF_BEACON?.trim();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-lang="en">
      <head>
        {/* 그리기 전에 언어를 확정한다 — 한국어 사용자에게 영어가 번쩍이지 않도록 */}
        <script dangerouslySetInnerHTML={{ __html: LANG_BOOTSTRAP }} />
      </head>
      <body>
        <a className="skip" href="#main">
          <T en="Skip to content" ko="본문으로" />
        </a>

        <header className="masthead">
          <div className="wrap masthead-inner">
            <Link href="/" className="brand">
              Works in Korea<span aria-hidden>?</span>
            </Link>
            <nav className="nav" aria-label="Sections">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href}>
                  <T {...item} />
                </Link>
              ))}
            </nav>
            <LangToggle />
          </div>
        </header>

        <main id="main">{children}</main>

        <footer className="colophon">
          <div className="wrap colophon-inner">
            <div>
              <p className="colophon-name">Works in Korea?</p>
              {/*
                "추적도 없고" 라고 적어 뒀었다. 방문자 수를 세기 시작한 이상 그건 거짓이다.
                쿠키를 안 쓰고 IP 를 안 남겨도, 세는 건 세는 것이다.
                무엇을 세고 무엇을 안 세는지는 /method 에 적었다.
              */}
              <T
                as="p"
                en="An independent measurement log. No accounts, no advertising, no cookies, nothing for sale."
                ko="직접 확인한 기록. 계정도 광고도 쿠키도 없고, 파는 것도 없습니다."
              />
            </div>

            <div>
              <h3>
                <T en="Data" ko="데이터" />
              </h3>
              <p>
                <a href={SITE.license.url} rel="license noreferrer" target="_blank">
                  {SITE.license.name}
                </a>{' '}
                — <T en="use it, just credit it" ko="출처만 밝히면 자유롭게" />
              </p>
              <p>
                <Link href="/api-docs/">
                  <T en="Public JSON API" ko="공개 JSON API" />
                </Link>
              </p>
            </div>

            <div>
              <h3>
                <T en="Found something wrong?" ko="사실과 다른가요?" />
              </h3>
              <p>
                <Link href="/report/">
                  <T en="Send a correction" ko="정정 요청 보내기" />
                </Link>
              </p>
              <p>
                <a href={`mailto:${SITE.contact}`}>{SITE.contact}</a>
              </p>
            </div>
          </div>
        </footer>

        {CF_BEACON && (
          <script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: CF_BEACON })}
          />
        )}
      </body>
    </html>
  );
}
