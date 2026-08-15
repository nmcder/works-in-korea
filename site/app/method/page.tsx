import type { Metadata } from 'next';
import { formatUtc } from '@/lib/time';
import { getBlockedServices, getLatestRun, getServices } from '@/lib/data';

export const metadata: Metadata = {
  title: 'How this is measured',
  description:
    'Exactly what each signal means, how it is produced, what we refuse to do, and where the method is known to be weak.',
};

export default async function MethodPage() {
  const [run, services, blocked] = await Promise.all([
    getLatestRun(),
    getServices(),
    getBlockedServices(),
  ]);
  const vantageIsKorea = run?.vantage_point.country?.toLowerCase() === 'kr';

  return (
    <>
      <section className="hero">
        <div className="wrap">
          <h1>How this is measured</h1>
          <p className="lede">
            A number without a method is a rumour. This page says exactly what each value means, how
            it was produced, what we refuse to do, and where the method is known to be weak.
          </p>
          <p className="lede-ko">
            측정 방법이 없는 숫자는 소문입니다. 이 페이지는 각 값이 무엇을 뜻하는지, 어떻게
            만들어졌는지, 무엇을 하지 않는지, 그리고 어디가 약한지를 그대로 적습니다.
          </p>
        </div>
      </section>

      <div className="wrap">
        <div className="prose">
          {vantageIsKorea && (
            <div className="notice" style={{ borderLeftColor: 'var(--barrier)', margin: '24px 0' }}>
              <strong>Read this before trusting the &ldquo;from abroad&rdquo; numbers.</strong> The
              most recent run was executed from an IP address in {run?.vantage_point.region ?? 'Korea'}{' '}
              (<span className="mono">{run?.vantage_point.country?.toUpperCase()}</span>,{' '}
              <span className="mono">{run?.vantage_point.ip_asn}</span>) — a Korean vantage point,
              not a foreign one. Anything that is blocked only for overseas visitors would have
              loaded fine for that run. The scheduled runs execute on GitHub&rsquo;s hosted machines
              outside Korea; this particular one did not.
              <br />
              <br />
              <span style={{ color: 'var(--faint)' }}>
                가장 최근 실행은 한국 IP에서 이뤄졌습니다. 해외에서만 막히는 것은 그 실행에서 정상으로
                보였을 것입니다. 예약 실행은 해외 러너에서 돌지만 이 실행은 아닙니다.
              </span>
            </div>
          )}

          <h2>Where we measure from</h2>
          <p>
            The measurement runs on GitHub&rsquo;s hosted runners, which sit outside Korea. That is
            not an accident of hosting — it is the point. The default environment of the robot is
            the same environment a foreign visitor is in. Every run records the country, region and
            network it came from, and that record is published with the data.
          </p>
          {run && (
            <table>
              <tbody>
                <tr>
                  <td>Last run</td>
                  <td className="mono">{formatUtc(run.finished_at)}</td>
                </tr>
                <tr>
                  <td>Vantage point</td>
                  <td className="mono">
                    {run.vantage_point.country?.toUpperCase() ?? 'unknown'}
                    {run.vantage_point.region ? ` · ${run.vantage_point.region}` : ''}
                    {run.vantage_point.ip_asn ? ` · ${run.vantage_point.ip_asn}` : ''}
                  </td>
                </tr>
                <tr>
                  <td>Services visited</td>
                  <td className="mono">
                    {run.services_probed} of {run.services_total}
                  </td>
                </tr>
                <tr>
                  <td>Duration</td>
                  <td className="mono">{Math.round(run.duration_ms / 1000)}s</td>
                </tr>
                <tr>
                  <td>Errors</td>
                  <td className="mono">{run.errors.length}</td>
                </tr>
              </tbody>
            </table>
          )}

          <h2>What we will not do</h2>
          <p>
            These are hard rules in the code, not intentions. They are the reason two of the eight
            questions can only be answered by people.
          </p>
          <ul>
            <li>
              <strong>No payment is ever attempted.</strong> The crawler cannot submit a checkout
              form. Whether a foreign card works is therefore only ever a community report.
              <br />
              <span className="ko">자동 결제 시도 없음.</span>
            </li>
            <li>
              <strong>No account is ever created and no login is ever attempted.</strong> The browser
              wrapper exposes no way to type into a field or click a button — it can only read.
              <br />
              <span className="ko">자동 가입·로그인 시도 없음. 브라우저 래퍼에 입력·클릭 기능이 없음.</span>
            </li>
            <li>
              <strong>robots.txt is obeyed.</strong> If a site tells crawlers to stay away from a
              path, we do not request it, even though nothing would stop us.{' '}
              {blocked.length} of {services.length} services are unmeasurable for this reason.
              <br />
              <span className="ko">robots.txt 준수. 그래서 {blocked.length}개 서비스는 자동 측정이 불가합니다.</span>
            </li>
            <li>
              <strong>Public pages, GET only, once a day.</strong> Requests are spaced out per host.
              The user agent carries this project&rsquo;s name and a contact address so any operator
              can find us.
              <br />
              <span className="ko">공개 페이지 GET만, 하루 1회, 호스트별 간격 유지, UA에 연락처 명시.</span>
            </li>
          </ul>

          <h2>What each value means</h2>

          <h3>Access from abroad</h3>
          <p>
            The page is fetched and the response inspected for explicit country-restriction wording.
            A refusal that could equally be bot filtering (HTTP 403 or 429, &ldquo;Access
            Denied&rdquo;) is <em>not</em> recorded as a block — from the outside those two look
            identical, and guessing between them would be inventing data.
          </p>

          <h3>Interface languages</h3>
          <p>
            Languages are counted only when the site itself declares them: an{' '}
            <code>hreflang</code> tag, a language switcher, or a working language-specific path.
            Korean is always included as the baseline. This measures whether a language is offered —
            not how good the translation is, and not how much of the site it covers.
          </p>

          <h3>Korean phone verification at sign-up</h3>
          <p>
            The sign-up page is opened and read. We look for the fingerprints of Korean identity
            verification vendors — PASS, NICE, KCB, i-PIN, resident registration number fields — in
            the loaded scripts and visible text. A value is only recorded if the page is genuinely a
            sign-up flow <em>and</em> has fields a person would fill in. An information page that
            merely mentions i-PIN proves nothing, and a log-in screen is not a sign-up screen; both
            are left blank on purpose.
          </p>
          <p>
            Whether it is <strong>required</strong> or merely <strong>one option</strong> is judged
            by whether an alternative route (email, Google, Apple) appears alongside it. That part is
            a heuristic and is marked as such — the matched evidence is printed under every value so
            it can be argued with.
          </p>

          <h3>Mobile apps</h3>
          <p>
            Only whether a listing exists on the App Store and Google Play. We do <em>not</em> report
            which countries an app is released in. Three separate endpoints were tested for that and
            all three return the same answer regardless of the country asked about, so any
            country-level claim would have been fabricated. It is left out rather than guessed.
          </p>

          <h3>Payment gateways seen</h3>
          <p>
            Which payment providers appear in the code of public pages. An empty result means{' '}
            <strong>nothing was detected on the pages we can reach</strong> — usually because
            checkout sits behind a login. It does not mean the service has no payment gateway, and it
            says nothing about whether your card will work.
          </p>

          <h3>English customer support</h3>
          <p>
            Whether the service states that support is available in English. Absence of a clear
            statement is recorded as no value, not as &ldquo;no English support&rdquo;.
          </p>

          <h3>Foreign card · SMS to a foreign number</h3>
          <p>
            Community reports only, for the reasons above. Until someone reports, these stay empty.
          </p>

          <h2>How confident is a value</h2>
          <table>
            <thead>
              <tr>
                <th>Label</th>
                <th>Meaning</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>measured by machine</td>
                <td>
                  Produced by an automated probe on the date shown. Reproducible; the raw evidence is
                  published.
                  <br />
                  <span className="ko">자동 프로브가 측정. 원본 근거 공개.</span>
                </td>
              </tr>
              <tr>
                <td>reported by people</td>
                <td>
                  Someone did the thing and told us what happened. Not independently reproducible.
                  <br />
                  <span className="ko">실제로 해 본 사람의 제보. 재현 불가.</span>
                </td>
              </tr>
              <tr>
                <td>reports disagree</td>
                <td>
                  Two credible reports contradict each other. We show the conflict rather than
                  picking a winner.
                  <br />
                  <span className="ko">제보가 엇갈림. 한쪽을 고르지 않고 그대로 드러냄.</span>
                </td>
              </tr>
              <tr>
                <td>no value recorded</td>
                <td>
                  We did not measure it, or what we saw was not strong enough to record. The reason is
                  always printed.
                  <br />
                  <span className="ko">재지 않았거나 근거가 약함. 이유를 항상 표시.</span>
                </td>
              </tr>
            </tbody>
          </table>

          <h2>Known weaknesses</h2>
          <ul>
            <li>
              <strong>One vantage point.</strong> Every run currently measures from a single
              location. A service blocked in one country but not another is invisible to us.
            </li>
            <li>
              <strong>Pages that build themselves in the browser.</strong> Some sign-up screens
              render differently between two visits, so a value can flip without anything having
              changed at the company.
            </li>
            <li>
              <strong>Sign-up URLs are supplied by hand.</strong> Where we have not found the right
              page, the question is left unanswered rather than answered from the wrong page.
            </li>
            <li>
              <strong>A measurement is a snapshot.</strong> It describes the moment stamped on it and
              nothing else. That is why the timestamp is never hidden.
            </li>
          </ul>

          <h2>Corrections</h2>
          <p>
            Everything here is meant to be falsifiable — that is why the raw evidence sits under each
            value. If a value is wrong, write to{' '}
            <a href="mailto:kkw5863@gmail.com">kkw5863@gmail.com</a> with what you saw and it will be
            corrected with its source recorded. We describe what was observed at a point in time; we
            do not rate, rank, or recommend services.
          </p>
          <p className="ko">
            모든 값은 반증 가능하도록 원본 근거를 함께 공개합니다. 사실과 다르면 알려주세요. 이
            사이트는 서비스를 평가하거나 순위를 매기지 않고, 특정 시점에 관측된 것만 기술합니다.
          </p>
        </div>
      </div>
    </>
  );
}
