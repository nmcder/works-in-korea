import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@/lib/site-config';
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
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="wrap">
            <Link href="/" className="brand">
              Works in Korea<span>?</span>
            </Link>
            <nav className="site-nav">
              <Link href="/">Services</Link>
              <Link href="/changes/">Changes</Link>
              <Link href="/method/">Method</Link>
              <Link href="/api-docs/">Data</Link>
            </nav>
          </div>
        </header>

        <main>{children}</main>

        <footer className="site-footer">
          <div className="wrap">
            <div>
              No accounts, no ads, no tracking. Data is{' '}
              <a href={SITE.license.url} rel="license noreferrer" target="_blank">
                {SITE.license.name}
              </a>
              .
              <br />
              <span style={{ color: 'var(--faint)' }}>
                계정·광고·추적 없음. 데이터는 {SITE.license.name} 로 공개.
              </span>
            </div>
            <div>
              Something wrong? <a href={`mailto:${SITE.contact}`}>{SITE.contact}</a>
              <br />
              <span style={{ color: 'var(--faint)' }}>
                사실과 다른 값을 발견하면 알려주세요. 근거와 함께 정정합니다.
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
