import type { Metadata } from 'next';
import { getCoverage, getServices } from '@/lib/data';
import { SITE } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Get the data',
  description:
    'The whole dataset as plain JSON, free to use under CC BY 4.0. No key, no sign-up, no rate limit.',
};

export default async function DataPage() {
  const [services, coverage] = await Promise.all([getServices(), getCoverage()]);
  const example = services.find((s) => s.id === 'coupang') ?? services[0];
  const recorded = coverage.reduce((n, c) => n + c.measured, 0);

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <h1>Get the data</h1>
          <p className="lede">
            Everything on this site is a static JSON file you can fetch. No key, no sign-up, no rate
            limit — {SITE.license.name}, just credit the source. If you are building something for
            people arriving in Korea, take it.
          </p>
          <p className="lede-ko">
            이 사이트의 모든 데이터는 그냥 JSON 파일입니다. 키·가입·요청 제한 없음.{' '}
            {SITE.license.name} — 출처만 밝히면 자유롭게 쓰세요.
          </p>
        </div>
      </section>

      <div className="wrap">
        <div className="prose">
          <h2>Endpoints</h2>
          <table>
            <thead>
              <tr>
                <th>Path</th>
                <th>What it holds</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <a href="/api/v1/services.json">/api/v1/services.json</a>
                </td>
                <td>
                  All {services.length} services with all 8 signals. About {recorded} recorded
                  values.
                </td>
              </tr>
              <tr>
                <td>
                  <a href={`/api/v1/services/${example?.id}.json`}>
                    /api/v1/services/{'{id}'}.json
                  </a>
                </td>
                <td>One service. The id is the slug in this site&rsquo;s URLs.</td>
              </tr>
              <tr>
                <td>
                  <a href="/api/v1/changes.json">/api/v1/changes.json</a>
                </td>
                <td>Every value that has changed, grouped by date, newest first.</td>
              </tr>
              <tr>
                <td>
                  <a href="/api/v1/meta.json">/api/v1/meta.json</a>
                </td>
                <td>Dataset size, license, and the last measurement run including its location.</td>
              </tr>
            </tbody>
          </table>

          <h2>The shape of a signal</h2>
          <p>
            Every one of the eight signals on every service has the same envelope. The value is never
            alone.
          </p>
          <pre
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: 14,
              overflowX: 'auto',
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            {`"signup_phone_auth": {
  "value": "required",
  "measured_at": "2026-08-15T04:28:31.541Z",
  "first_seen_at": "2026-08-15T04:15:30.926Z",
  "last_changed_at": "2026-08-15T04:15:30.926Z",
  "method": "auto:signup_phone_auth",
  "confidence": "auto",
  "evidence": { "...": "what the probe actually saw" }
}`}
          </pre>

          <h2>Three things to get right if you use this</h2>
          <ul>
            <li>
              <strong>
                <code>confidence: &quot;unknown&quot;</code> is not a negative result.
              </strong>{' '}
              It means we did not measure it. The <code>evidence</code> object says why — robots.txt,
              a bot wall, an unknown URL, or evidence too weak to record. Rendering it as
              &ldquo;no&rdquo; would turn our honesty into your misinformation.
              <br />
              <span className="ko">
                unknown 은 &ldquo;아니오&rdquo;가 아니라 &ldquo;재지 않았다&rdquo;입니다.
              </span>
            </li>
            <li>
              <strong>
                Show <code>measured_at</code> wherever you show a value.
              </strong>{' '}
              A fact about a Korean sign-up flow has a shelf life. The timestamp is the part that
              makes it usable.
              <br />
              <span className="ko">값을 보여줄 때는 measured_at 도 함께 보여주세요.</span>
            </li>
            <li>
              <strong>An empty gateway list does not mean you cannot pay.</strong> It means nothing
              was detected on pages reachable without logging in.
              <br />
              <span className="ko">
                결제사 목록이 비어 있는 것은 &ldquo;결제 불가&rdquo;가 아니라 &ldquo;공개 페이지에서
                탐지되지 않음&rdquo;입니다.
              </span>
            </li>
          </ul>

          <h2>License</h2>
          <p>
            <a href={SITE.license.url} rel="license noreferrer" target="_blank">
              Creative Commons Attribution 4.0
            </a>
            . Use it commercially, build on it, redistribute it — just say where it came from. If you
            do build something with it, tell us; corrections from people using the data in anger are
            the most useful kind.
          </p>
          <p className="ko">
            상업적 이용·재배포 모두 가능합니다. 출처만 밝혀 주세요. 이 데이터로 뭔가 만들면
            알려주세요 — 실제로 쓰는 사람의 정정이 가장 정확합니다.
          </p>
        </div>
      </div>
    </>
  );
}
