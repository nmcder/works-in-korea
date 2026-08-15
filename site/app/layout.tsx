import type { Metadata } from 'next';
import { Newsreader } from 'next/font/google';
import Link from 'next/link';
import { LangToggle } from '@/components/LangToggle';
import { LANG_BOOTSTRAP, T } from '@/lib/i18n';
import { SITE } from '@/lib/site-config';
import './globals.css';

/**
 * 제목용 세리프. 본문·데이터는 시스템 폰트를 쓴다.
 *
 * 한글 웹폰트는 파일이 수 MB라 정적 사이트에 얹으면 첫 화면이 눈에 띄게 느려진다.
 * 그래서 라틴 제목에만 웹폰트를 쓰고 한글은 OS 폰트에 맡긴다.
 * next/font 는 빌드 시점에 폰트를 받아 자체 호스팅하므로 방문자 브라우저는
 * 외부 요청을 하지 않는다 (추적 없음 원칙과도 맞는다).
 */
const display = Newsreader({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-display',
});

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
  },
  robots: { index: true, follow: true },
};

const NAV = [
  { href: '/', en: 'Services', ko: '서비스' },
  { href: '/changes/', en: 'Changes', ko: '변경 기록' },
  { href: '/method/', en: 'Method', ko: '확인 방법' },
  { href: '/report/', en: 'Report', ko: '제보' },
  { href: '/api-docs/', en: 'Data', ko: '데이터' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-lang="en" className={display.variable}>
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
              <T
                as="p"
                en="An independent measurement log. No accounts, no advertising, no tracking, nothing for sale."
                ko="직접 확인한 기록. 계정도 광고도 추적도 없고, 파는 것도 없습니다."
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
      </body>
    </html>
  );
}
