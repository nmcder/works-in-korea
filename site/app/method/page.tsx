import type { Metadata } from 'next';
import { getBlockCounts, getBlockedServices, getLatestRun, getServices } from '@/lib/data';
import { Only, T, TBlock } from '@/lib/i18n';
import { formatUtc } from '@/lib/time';

export const metadata: Metadata = {
  title: 'How this is measured',
  description:
    'Exactly what each value means, how it was produced, what we refuse to do, and where the method is known to be weak.',
};

export default async function MethodPage() {
  const [run, services, blocked, counts] = await Promise.all([
    getLatestRun(),
    getServices(),
    getBlockedServices(),
    getBlockCounts(),
  ]);
  const n = services.length;
  const nBlocked = blocked.length;
  const koreanVantage = run?.vantage_point.country?.toLowerCase() === 'kr';

  return (
    <>
      <section className="hero hero-narrow">
        <div className="wrap">
          <h1>
            <T en="How this is measured" ko="어떻게 측정하는가" />
          </h1>
          <TBlock
            className="standfirst"
            en="A number without a method is a rumour. This page says exactly what each value means, how it was produced, what we refuse to do, and where the method is known to be weak."
            ko="측정 방법이 없는 숫자는 소문입니다. 이 페이지는 각 값이 무엇을 뜻하는지, 어떻게 만들어졌는지, 무엇을 하지 않는지, 그리고 어디가 약한지를 그대로 적습니다."
          />
        </div>
      </section>

      <div className="wrap">
        <div className="prose">
          {koreanVantage && (
            <div className="aside warn">
              <h3>
                <T
                  en="Read this before trusting the “from abroad” figures."
                  ko="‘해외 접속’ 수치를 믿기 전에 읽어 주세요."
                />
              </h3>
              <T
                en={`The most recent run was executed from an address inside Korea (${run?.vantage_point.region ?? 'Korea'}). Anything blocked only for overseas visitors would have loaded normally for that run. Scheduled runs execute outside Korea; this particular one did not.`}
                ko={`가장 최근 실행은 한국 안(${run?.vantage_point.region ?? '한국'})에서 이뤄졌습니다. 해외에서만 막히는 것은 그 실행에서 정상으로 보였을 것입니다. 예약 실행은 한국 밖에서 돌지만 이 실행은 아니었습니다.`}
              />
            </div>
          )}

          {/* ---------------------------------------------------------- 측정 지점 */}

          <h2>
            <T en="Where we measure from" ko="어디서 재는가" />
          </h2>

          <Only lang="en">
            <p>
              The measurement runs on GitHub&rsquo;s hosted runners, which sit outside Korea. That is
              not an accident of hosting — it is the point. Every run records the country, region and
              network it came from, and that record is published alongside the data.
            </p>
            <p>
              <strong>
                But a cloud runner is not the same thing as a tourist with a phone, and we will not
                pretend otherwise.
              </strong>{' '}
              Those runners live in a datacentre, on address ranges that plenty of Korean sites treat
              differently from a home broadband line or a roaming SIM — some block datacentre traffic
              outright as suspected VPN or scraping. So when a site does not answer us we are looking
              at two possible causes at once: <em>being outside Korea</em> and{' '}
              <em>being on a datacentre address</em>. A single run cannot separate them, and we do not
              publish a guess as though it were a measurement.
            </p>
            <p>
              This is not hypothetical. The first run from outside Korea, on 15 August 2026, found six
              services that had answered normally from a Korean address a few hours earlier: two
              refused outright with HTTP 403, one served a Korean &ldquo;abnormal access&rdquo;
              interstitial, two never completed a connection at all, and one presented a certificate
              chain that could not be verified. Every one of those is recorded as{' '}
              <strong>no value</strong> rather than &ldquo;blocked&rdquo;. Establishing which of them
              actually turn a visitor away needs somebody in the country on an ordinary connection —
              which is the entire argument for first-hand reports.
            </p>
          </Only>

          <Only lang="ko">
            <p>
              측정은 GitHub이 제공하는 실행 서버에서 돌아가고, 그 서버는 한국 밖에 있습니다. 호스팅
              사정이 아니라 의도입니다. 모든 실행은 자기가 어느 나라·어느 지역·어느 네트워크에서
              나갔는지를 기록하고, 그 기록은 데이터와 함께 공개됩니다.
            </p>
            <p>
              <strong>
                다만 클라우드 서버는 휴대폰을 든 여행자와 같지 않고, 같은 척하지 않겠습니다.
              </strong>{' '}
              이 서버들은 데이터센터에 있고, 한국 사이트 상당수는 데이터센터 IP 대역을 가정용
              인터넷이나 로밍 회선과 다르게 취급합니다. 아예 VPN·스크래핑으로 보고 막는 곳도
              있습니다. 그래서 어떤 사이트가 응답하지 않을 때 원인 후보가 둘입니다.{' '}
              <em>한국 밖이라서</em>와 <em>데이터센터 주소라서</em>. 한 번의 실행으로는 둘을 가를 수
              없고, 추측을 측정인 것처럼 발표하지 않습니다.
            </p>
            <p>
              가정이 아닙니다. 2026년 8월 15일 한국 밖에서 처음 실행했을 때, 몇 시간 전 한국
              주소에서는 멀쩡히 응답하던 서비스 여섯 곳이 달라졌습니다. 둘은 HTTP 403으로 거부했고,
              하나는 &lsquo;비정상적인 접근&rsquo; 안내 화면을 내줬고, 둘은 연결 자체가 끝내 되지
              않았고, 하나는 검증할 수 없는 인증서 체인을 내려줬습니다. 이 여섯 건 모두{' '}
              <strong>&lsquo;차단됨&rsquo;이 아니라 &lsquo;값 없음&rsquo;</strong>으로 기록돼
              있습니다. 이 중 무엇이 실제로 방문자를 돌려보내는지는 평범한 회선을 쓰는 현지의 사람만
              확인할 수 있고, 그것이 제보를 받는 이유 전부입니다.
            </p>
          </Only>

          {run && (
            <table className="datatable">
              <tbody>
                <tr>
                  <td>
                    <T en="Last run" ko="마지막 실행" />
                  </td>
                  <td className="mono">{formatUtc(run.finished_at)}</td>
                </tr>
                <tr>
                  <td>
                    <T en="Vantage point" ko="측정 지점" />
                  </td>
                  <td className="mono">
                    {[
                      run.vantage_point.country?.toUpperCase(),
                      run.vantage_point.region,
                      run.vantage_point.ip_asn,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'unknown'}
                  </td>
                </tr>
                <tr>
                  <td>
                    <T en="Services visited" ko="방문한 서비스" />
                  </td>
                  <td className="mono">
                    {run.services_probed} / {run.services_total}
                  </td>
                </tr>
                <tr>
                  <td>
                    <T en="Duration" ko="소요 시간" />
                  </td>
                  <td className="mono">{Math.round(run.duration_ms / 1000)}s</td>
                </tr>
                <tr>
                  <td>
                    <T en="Errors" ko="오류" />
                  </td>
                  <td className="mono">{run.errors.length}</td>
                </tr>
              </tbody>
            </table>
          )}

          {/* ------------------------------------------------------ 하지 않는 것 */}

          <h2>
            <T en="What we will not do" ko="하지 않는 것" />
          </h2>

          <Only lang="en">
            <p>
              These are hard rules in the code, not intentions. They are the reason two of the eight
              questions can only ever be answered by people.
            </p>
            <ul>
              <li>
                <strong>No payment is ever attempted.</strong> The crawler cannot submit a checkout
                form. Whether a foreign card works is therefore only ever a community report.
              </li>
              <li>
                <strong>No account is created and no login is attempted.</strong> The browser wrapper
                exposes no way to type into a field or click a button — it can only read.
              </li>
              <li>
                <strong>robots.txt is obeyed.</strong> If a site tells crawlers to stay away from a
                path we do not request it, even though nothing would stop us. That is why{' '}
                {counts['robots-disallow']} of {n} services are unmeasurable by us.
              </li>
              <li>
                <strong>Public pages, GET only, once a day.</strong> Requests are spaced out per host.
                The user agent carries this project&rsquo;s address and a contact, so any site
                operator who notices us can find out who we are and tell us to stop.
              </li>
            </ul>
          </Only>

          <Only lang="ko">
            <p>
              의도가 아니라 코드에 박혀 있는 규칙입니다. 여덟 개 질문 중 둘이 오직 사람만 답할 수
              있는 이유이기도 합니다.
            </p>
            <ul>
              <li>
                <strong>결제를 시도하지 않습니다.</strong> 크롤러에는 결제 양식을 제출하는 기능이
                없습니다. 해외 카드가 되는지는 그래서 언제나 제보로만 채워집니다.
              </li>
              <li>
                <strong>계정을 만들지 않고 로그인하지 않습니다.</strong> 브라우저 래퍼에 입력·클릭
                기능 자체를 넣지 않았습니다. 읽기만 됩니다.
              </li>
              <li>
                <strong>robots.txt를 지킵니다.</strong> 사이트가 특정 경로에 크롤러를 막아 두면
                요청하지 않습니다. 막을 방법이 없는데도 그렇게 합니다. {n}개 중{' '}
                {counts['robots-disallow']}개를 우리가 잴 수 없는 이유입니다.
              </li>
              <li>
                <strong>공개 페이지만, GET만, 하루 한 번.</strong> 같은 호스트에는 간격을 두고
                요청합니다. User-Agent에 이 프로젝트의 주소와 연락처를 넣어, 우리를 발견한 사이트
                운영자가 우리가 누구인지 확인하고 그만두라고 말할 수 있게 했습니다.
              </li>
            </ul>
          </Only>

          {/* ------------------------------------------------------- 값의 정의 */}

          <h2>
            <T en="What each value means" ko="각 값이 뜻하는 것" />
          </h2>

          <Only lang="en">
            <h3>Access from abroad</h3>
            <p>
              The page is fetched and the response inspected for explicit country-restriction wording.
              A refusal that could equally be bot filtering (HTTP 403 or 429, &ldquo;Access
              Denied&rdquo;) is <em>not</em> recorded as a block — from the outside those two look
              identical, and guessing between them would be inventing data.
            </p>

            <h3>Interface languages</h3>
            <p>
              A language is counted only when the site itself declares it: an <code>hreflang</code>{' '}
              tag, a language switcher, or a working language-specific path. Korean is always included
              as the baseline. This measures whether a language is offered — not how good the
              translation is, and not how much of the site it covers.
            </p>

            <h3>Korean phone verification at sign-up</h3>
            <p>
              The sign-up page is opened and read. We look for the fingerprints of Korean identity
              verification vendors — PASS, NICE, KCB, i-PIN, resident registration number fields — in
              the loaded scripts and the visible text. A value is recorded only if the page is
              genuinely a sign-up flow <em>and</em> has fields a person would fill in. An information
              page that merely mentions i-PIN proves nothing, and a log-in screen is not a sign-up
              screen; both are left blank on purpose.
            </p>
            <p>
              Whether it is <strong>required</strong> or merely <strong>one option among others</strong>{' '}
              is judged by whether an alternative route (email, Google, Apple) appears alongside it.
              That part is a heuristic and is labelled as one — the matched evidence is printed under
              every value so it can be argued with.
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
            <p>Community reports only, for the reasons above. Until someone reports, these stay empty.</p>
          </Only>

          <Only lang="ko">
            <h3>해외 접속</h3>
            <p>
              페이지를 받아 와서 국가 제한을 명시하는 문구가 있는지 봅니다. 봇 차단일 수도 있는
              거부(HTTP 403·429, &lsquo;Access Denied&rsquo;)는 <em>차단으로 기록하지 않습니다</em>.
              바깥에서는 둘이 똑같아 보이고, 그 사이를 추측으로 메우면 데이터를 지어내는 것이 됩니다.
            </p>

            <h3>인터페이스 언어</h3>
            <p>
              사이트가 스스로 선언한 언어만 셉니다. <code>hreflang</code> 태그, 언어 전환 링크, 실제로
              열리는 언어별 경로 중 하나 이상이어야 합니다. 한국어는 기준선으로 항상 포함합니다. 이
              값은 &lsquo;그 언어가 제공되는가&rsquo;만 재며, 번역 품질이나 적용 범위는 재지 않습니다.
            </p>

            <h3>가입 시 한국 휴대폰 본인인증</h3>
            <p>
              가입 페이지를 열어 읽습니다. 불러온 스크립트와 화면 문구에서 본인확인 사업자의
              흔적 — PASS, NICE, KCB, 아이핀, 주민등록번호 입력란 — 을 찾습니다. 그 페이지가 실제로
              가입 절차이고 <em>사람이 채우는 입력란이 있을 때만</em> 값을 남깁니다. 아이핀을 언급하기만
              하는 안내 문서는 아무것도 증명하지 않고, 로그인 화면은 가입 화면이 아닙니다. 둘 다
              일부러 비워 둡니다.
            </p>
            <p>
              <strong>필수</strong>인지 <strong>여러 선택지 중 하나</strong>인지는 이메일·구글·애플 같은
              대안 경로가 함께 보이는지로 판단합니다. 이 부분은 휴리스틱이며 그렇다고 표시해 둡니다.
              무엇이 매칭됐는지가 모든 값 아래에 그대로 찍혀 있어서 반박할 수 있습니다.
            </p>

            <h3>모바일 앱</h3>
            <p>
              App Store와 Google Play에 등록이 있는지만 봅니다. 어느 나라에 출시됐는지는{' '}
              <em>보고하지 않습니다</em>. 그것을 알아내려고 세 가지 경로를 시험했는데 셋 다 어느 나라를
              물어도 같은 답을 돌려줬습니다. 국가별 주장을 했다면 그것은 지어낸 것이 됐을 겁니다.
              추측하는 대신 뺐습니다.
            </p>

            <h3>탐지된 결제사</h3>
            <p>
              공개 페이지의 코드에 어떤 결제사가 나타나는지입니다. 결과가 비어 있으면{' '}
              <strong>우리가 열 수 있는 페이지에서 탐지되지 않았다</strong>는 뜻이고, 보통 결제 화면이
              로그인 뒤에 있기 때문입니다. 결제사가 없다는 뜻이 아니며, 당신의 카드가 될지에 대해서는
              아무 말도 하지 않습니다.
            </p>

            <h3>영어 고객지원</h3>
            <p>
              영어 지원을 제공한다고 사이트가 명시하는지 여부입니다. 명시가 없으면 &lsquo;영어 지원
              없음&rsquo;이 아니라 &lsquo;값 없음&rsquo;으로 기록합니다.
            </p>

            <h3>해외 카드 · 해외 번호 SMS</h3>
            <p>
              앞서 말한 이유로 제보로만 채웁니다. 제보가 올 때까지 비어 있습니다.
            </p>
          </Only>

          {/* --------------------------------------------------------- 신뢰도 */}

          <h2>
            <T en="How far to trust a value" ko="값을 얼마나 믿을 수 있는가" />
          </h2>

          <table className="datatable">
            <tbody>
              <tr>
                <td>
                  <T en="measured by machine" ko="기계가 측정" />
                </td>
                <td>
                  <T
                    en="Produced by an automated probe on the date shown. Reproducible; the raw evidence is published."
                    ko="표시된 날짜에 자동 프로브가 만든 값입니다. 재현 가능하고 원본 근거가 공개돼 있습니다."
                  />
                </td>
              </tr>
              <tr>
                <td>
                  <T en="reported by people" ko="사람이 제보" />
                </td>
                <td>
                  <T
                    en="Somebody did the thing and told us what happened. Not independently reproducible."
                    ko="실제로 해 본 사람이 결과를 알려준 값입니다. 독립적으로 재현할 수 없습니다."
                  />
                </td>
              </tr>
              <tr>
                <td>
                  <T en="reports disagree" ko="제보가 엇갈림" />
                </td>
                <td>
                  <T
                    en="Two credible reports contradict each other. We show the conflict instead of picking a winner."
                    ko="믿을 만한 제보 둘이 서로 모순됩니다. 한쪽을 고르지 않고 엇갈린다는 사실을 그대로 보여줍니다."
                  />
                </td>
              </tr>
              <tr>
                <td>
                  <T en="no value recorded" ko="값 없음" />
                </td>
                <td>
                  <T
                    en="We did not measure it, or what we saw was too weak to record. The reason is always printed next to it."
                    ko="재지 않았거나, 본 것이 값을 남기기에 약했습니다. 이유가 항상 값 옆에 적혀 있습니다."
                  />
                </td>
              </tr>
            </tbody>
          </table>

          {/* ------------------------------------------------------- 약한 곳 */}

          <h2>
            <T en="Where this method is weak" ko="이 방법이 약한 곳" />
          </h2>

          <Only lang="en">
            <ul>
              <li>
                <strong>One vantage point at a time.</strong> Each run measures from a single location
                on a datacentre network. A service blocked in one country but not another, or blocked
                for datacentres but not for phones, is invisible to us.
              </li>
              <li>
                <strong>Pages that assemble themselves in the browser.</strong> Some sign-up screens
                render differently between two visits, so a value can move without anything having
                changed at the company.
              </li>
              <li>
                <strong>Sign-up URLs are supplied by hand.</strong> Where we have not found the right
                page, the question is left unanswered rather than answered from the wrong page.
              </li>
              <li>
                <strong>{nBlocked} of {n} services cannot be measured by machine at all</strong> — by
                robots.txt, by refusal, by silence, or by an unverifiable certificate. For those,
                first-hand reports are not a supplement. They are the only source there is.
              </li>
              <li>
                <strong>A measurement is a snapshot.</strong> It describes the moment stamped on it and
                nothing else. That is why the timestamp is never hidden.
              </li>
            </ul>
          </Only>

          <Only lang="ko">
            <ul>
              <li>
                <strong>한 번에 한 지점에서만 잽니다.</strong> 각 실행은 데이터센터 네트워크의 한
                곳에서 측정합니다. 어떤 나라에서만 막히는 경우, 또는 데이터센터만 막고 휴대폰은
                허용하는 경우는 우리 눈에 보이지 않습니다.
              </li>
              <li>
                <strong>브라우저에서 조립되는 페이지.</strong> 어떤 가입 화면은 방문할 때마다 다르게
                그려집니다. 회사가 아무것도 바꾸지 않아도 값이 움직일 수 있습니다.
              </li>
              <li>
                <strong>가입 주소는 사람이 채웁니다.</strong> 맞는 페이지를 아직 못 찾은 경우, 엉뚱한
                페이지를 근거로 답하지 않고 답하지 않은 채로 둡니다.
              </li>
              <li>
                <strong>{n}개 중 {nBlocked}개는 기계로 아예 잴 수 없습니다.</strong> robots.txt로
                막혔거나, 거부당했거나, 응답이 없거나, 인증서를 검증할 수 없어서입니다. 이들에게 직접
                겪은 사람의 제보는 보완이 아니라 유일한 데이터원입니다.
              </li>
              <li>
                <strong>측정은 스냅숏입니다.</strong> 찍힌 그 시각을 설명할 뿐 그 밖의 것은 설명하지
                않습니다. 시각을 절대 숨기지 않는 이유입니다.
              </li>
            </ul>
          </Only>

          {/* --------------------------------------------------------- 정정 */}

          <h2>
            <T en="Corrections" ko="정정" />
          </h2>
          <TBlock
            en="Everything here is built to be falsifiable — that is why the raw evidence sits under each value. If a value is wrong, say what you saw and it will be corrected with its source recorded. We describe what was observed at a point in time; we do not rate, rank, or recommend services."
            ko="여기 있는 모든 것은 반증 가능하도록 만들어져 있습니다. 각 값 아래에 원본 근거가 있는 이유입니다. 틀린 값이 있으면 무엇을 보셨는지 알려주세요. 근거와 함께 정정합니다. 이 사이트는 특정 시점에 관측된 것을 기술할 뿐, 서비스를 평가하거나 순위를 매기거나 추천하지 않습니다."
          />
          <p style={{ marginTop: 20 }}>
            <a className="button" href="/report/">
              <T en="Send a correction" ko="정정 요청 보내기" />
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
