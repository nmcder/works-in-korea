import type { Metadata } from 'next';
import { getBlockCounts, getBlockedServices, getLatestRun, getServices } from '@/lib/data';
import { T, TBlock, type Bi } from '@/lib/i18n';
import { SITE } from '@/lib/site-config';
import { formatUtc } from '@/lib/time';

export const metadata: Metadata = {
  title: 'How this is measured',
  description:
    'What each value means, how it was produced, what the crawler never does, and where the method is weak.',
};

/** 각 값이 무엇을 재고 무엇을 못 재는지. 표 하나로 끝내는 편이 문단보다 읽힌다. */
const SIGNALS: { q: Bi; how: Bi; limit: Bi }[] = [
  {
    q: { en: 'Can you open it from outside Korea?', ko: '한국 밖에서 접속되나요?' },
    how: {
      en: 'The page is fetched from outside Korea and checked for country-restriction wording.',
      ko: '한국 밖에서 페이지를 받아 국가 제한 문구가 있는지 봅니다.',
    },
    limit: {
      en: 'A 403 or 429 is left blank, not called a block — bot filtering looks the same from here.',
      ko: '403·429는 막힘으로 적지 않고 비워 둡니다. 밖에서 보면 봇 차단과 구분되지 않습니다.',
    },
  },
  {
    q: { en: 'What languages can you use it in?', ko: '어떤 언어로 쓸 수 있나요?' },
    how: {
      en: 'Counted only when the site declares it: an hreflang tag, a language switcher, or a working language path.',
      ko: 'hreflang 태그, 언어 전환 버튼, 실제로 열리는 언어별 주소 중 하나가 있을 때만 셉니다.',
    },
    limit: {
      en: 'Whether a language is offered, not how good it is or how much of the site it covers.',
      ko: '그 언어가 있는지만 봅니다. 번역이 좋은지, 어디까지 적용됐는지는 보지 않습니다.',
    },
  },
  {
    q: { en: 'Do you need a Korean phone to sign up?', ko: '가입할 때 한국 휴대폰이 필요한가요?' },
    how: {
      en: 'The sign-up page is opened and read for Korean identity-verification widgets — PASS, NICE, KCB, i-PIN, resident number fields.',
      ko: '가입 페이지를 열어 본인확인 위젯이 있는지 봅니다. PASS·NICE·KCB·아이핀·주민등록번호 입력란.',
    },
    limit: {
      en: 'Left blank unless the page is really a sign-up form with fields. A login screen or an information page proves nothing.',
      ko: '입력란이 있는 진짜 가입 양식일 때만 값을 남깁니다. 로그인 화면이나 안내 문서로는 판단하지 않습니다.',
    },
  },
  {
    q: { en: 'Is there an app?', ko: '앱이 있나요?' },
    how: {
      en: 'Whether a listing exists on the App Store and Google Play.',
      ko: 'App Store와 Google Play에 등록이 있는지 봅니다.',
    },
    limit: {
      en: 'Not which countries it is released in. Three endpoints were tested and none distinguishes country, so it is left out.',
      ko: '어느 나라에 나왔는지는 보지 않습니다. 세 가지 경로를 시험했는데 나라를 구분해 주지 않아 뺐습니다.',
    },
  },
  {
    q: { en: 'Which payment services does it use?', ko: '어떤 결제사를 쓰나요?' },
    how: {
      en: 'Which payment providers appear in the code of pages that open without a login.',
      ko: '로그인 없이 열리는 페이지의 코드에 어떤 결제사가 나오는지 봅니다.',
    },
    limit: {
      en: 'Empty means nothing was found on reachable pages — checkout usually sits behind a login. It says nothing about your card.',
      ko: '비어 있으면 열 수 있는 페이지에서 못 찾았다는 뜻입니다. 결제 화면은 대개 로그인 뒤에 있습니다. 카드가 될지와는 무관합니다.',
    },
  },
  {
    q: { en: 'Is there help in English?', ko: '영어 고객지원이 있나요?' },
    how: {
      en: 'Whether the help pages state that support is available in English.',
      ko: '고객센터 페이지에 영어 지원을 한다고 적혀 있는지 봅니다.',
    },
    limit: {
      en: 'No clear statement is recorded as blank, never as “no English support”.',
      ko: '명시가 없으면 비워 둡니다. 영어 지원이 없다고 적지 않습니다.',
    },
  },
  {
    q: { en: 'Does a foreign card work?', ko: '해외 카드로 결제되나요?' },
    how: { en: 'Community reports only.', ko: '이용자 제보로만 채웁니다.' },
    limit: {
      en: 'Answering it means putting a real card through a real checkout. The crawler cannot submit a payment.',
      ko: '실제 카드로 결제를 눌러봐야 알 수 있습니다. 크롤러는 결제를 제출할 수 없습니다.',
    },
  },
  {
    q: { en: 'Do codes reach a foreign number?', ko: '해외 번호로 인증번호가 오나요?' },
    how: { en: 'Community reports only.', ko: '이용자 제보로만 채웁니다.' },
    limit: {
      en: 'Answering it means requesting a real text to a real number. The crawler cannot fill in a form.',
      ko: '실제 번호로 문자를 받아봐야 알 수 있습니다. 크롤러는 양식을 채울 수 없습니다.',
    },
  },
];

const TRUST: { tag: Bi; means: Bi }[] = [
  {
    tag: { en: 'measured by machine', ko: '자동 확인' },
    means: {
      en: 'Produced by a probe on the date shown. Reproducible, and the raw evidence is published under the value.',
      ko: '표시된 날짜에 프로브가 만든 값입니다. 다시 재현할 수 있고, 원본 근거가 값 아래에 붙어 있습니다.',
    },
  },
  {
    tag: { en: 'reported by people', ko: '이용자 제보' },
    means: {
      en: 'Somebody did it and said what happened. Not independently reproducible.',
      ko: '실제로 해 본 사람이 결과를 알려준 값입니다. 다시 재현할 수는 없습니다.',
    },
  },
  {
    tag: { en: 'reports disagree', ko: '제보가 엇갈림' },
    means: {
      en: 'Two credible reports contradict each other, so both are shown instead of one being picked.',
      ko: '믿을 만한 제보 둘이 서로 다릅니다. 한쪽을 고르지 않고 엇갈린다고 적습니다.',
    },
  },
  {
    tag: { en: 'no value recorded', ko: '기록 없음' },
    means: {
      en: 'Not measured, or what was seen was too weak to record. The reason is always printed next to it.',
      ko: '확인하지 못했거나, 본 것이 값을 남기기엔 약했습니다. 이유가 항상 옆에 적혀 있습니다.',
    },
  },
];

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
            <T en="How this is measured" ko="확인 방법" />
          </h1>
          <TBlock
            className="standfirst"
            en="What each value means, how it was produced, what the crawler never does, and where the method is weak."
            ko="각 값이 무엇인지, 어떻게 만들어졌는지, 크롤러가 절대 하지 않는 일, 그리고 이 방법이 약한 곳."
          />
        </div>
      </section>

      <div className="wrap">
        <div className="prose">
          {koreanVantage && (
            <div className="aside warn">
              <h3>
                <T
                  en="The latest run was made from inside Korea."
                  ko="가장 최근 확인은 한국 안에서 이뤄졌습니다."
                />
              </h3>
              <T
                en={`It ran from ${run?.vantage_point.region ?? 'Korea'}, so anything that blocks only overseas visitors would have loaded normally. Scheduled runs go from outside Korea; this one did not.`}
                ko={`${run?.vantage_point.region ?? '한국'}에서 돌았기 때문에, 해외에서만 막히는 것은 정상으로 보였을 수 있습니다. 예약 실행은 한국 밖에서 돌지만 이번엔 아니었습니다.`}
              />
            </div>
          )}

          <h2>
            <T en="The crawler never does these" ko="크롤러가 하지 않는 일" />
          </h2>

          <TBlock
            en="These are enforced in code, not promised in prose. They are why two of the eight questions can only be answered by people."
            ko="약속이 아니라 코드에 박아 둔 규칙입니다. 여덟 개 질문 중 둘이 사람만 답할 수 있는 이유이기도 합니다."
          />

          <ul>
            <li>
              <strong>
                <T en="Never pays." ko="결제하지 않습니다." />
              </strong>{' '}
              <T
                en="There is no code path that submits a checkout form."
                ko="결제 양식을 제출하는 코드 자체가 없습니다."
              />
            </li>
            <li>
              <strong>
                <T en="Never signs up or logs in." ko="가입하거나 로그인하지 않습니다." />
              </strong>{' '}
              <T
                en="The browser wrapper exposes no way to type or click. It can only read."
                ko="브라우저 래퍼에 입력·클릭 기능을 넣지 않았습니다. 읽기만 됩니다."
              />
            </li>
            <li>
              <strong>
                <T en="Obeys robots.txt." ko="robots.txt를 지킵니다." />
              </strong>{' '}
              <T
                en={`A disallowed path is not requested at all. That is why ${counts['robots-disallow']} of ${n} services cannot be measured here.`}
                ko={`막아 둔 경로는 아예 요청하지 않습니다. ${n}개 중 ${counts['robots-disallow']}개를 여기서 확인할 수 없는 이유입니다.`}
              />
            </li>
            <li>
              <strong>
                <T en="Public pages, GET only, once a day." ko="공개 페이지만, GET만, 하루 한 번." />
              </strong>{' '}
              <T
                en="Requests to the same host are spaced out, and the user agent carries this site's address and a contact, so any operator who sees us can tell us to stop."
                ko="같은 사이트에는 간격을 두고 요청합니다. User-Agent에 이 사이트 주소와 연락처를 넣어, 발견한 운영자가 그만두라고 말할 수 있게 했습니다."
              />
            </li>
          </ul>

          {/*
            "규칙을 지킨다"는 말은 코드를 볼 수 있을 때만 검증 가능한 주장이다.
            그 코드로 가는 길을 안 열어 두면 이 페이지 전체가 그냥 약속에 그친다.
          */}
          <div className="aside mark">
            <h3>
              <T en="You do not have to take our word for it" ko="말로만 믿으실 필요 없습니다" />
            </h3>
            <T
              en="Every rule above is enforced in code, and the code is public along with every measurement ever taken. The daily results are committed to git, so what changed and when is in the history rather than in a claim."
              ko="위 규칙은 전부 코드로 강제돼 있고, 그 코드와 지금까지의 모든 측정값이 공개돼 있습니다. 매일의 결과가 git에 쌓이므로 무엇이 언제 바뀌었는지는 주장이 아니라 기록으로 남습니다."
            />
            <p style={{ marginTop: 14 }}>
              <a className="button ghost" href={SITE.repo} rel="noreferrer" target="_blank">
                <T en="Read the measurement code" ko="측정 코드 보기" />
              </a>
            </p>
          </div>

          <h2>
            <T en="What this site counts about you" ko="이 사이트가 방문자에 대해 세는 것" />
          </h2>
          <TBlock
            en="Page views, in aggregate, through Cloudflare Web Analytics. It sets no cookies, stores nothing on your device, and does not keep IP addresses — your country is worked out from the request and then thrown away. It tells us that a page was opened, not who opened it, and there is no way to follow one visitor from one page to the next."
            ko="페이지가 몇 번 열렸는지를 Cloudflare Web Analytics 로 셉니다. 쿠키를 만들지 않고, 기기에 아무것도 저장하지 않으며, IP 주소를 보관하지 않습니다 — 국가만 계산하고 바로 버립니다. 어떤 페이지가 열렸다는 사실만 알 수 있고 누가 열었는지는 알 수 없으며, 한 사람이 다음 페이지로 넘어가는 것을 따라갈 방법도 없습니다."
          />
          <TBlock
            en="Why count at all: without it there is no way to tell whether anything here reaches anyone. Google Search Console shows only visitors who arrived through a Google search, so a link shared in a forum or a chat is invisible. Guessing is worse than a number that identifies nobody."
            ko="왜 세느냐면, 세지 않으면 여기 있는 것이 누구에게든 닿는지 알 방법이 없기 때문입니다. Google Search Console 은 구글 검색으로 들어온 사람만 보여주므로, 커뮤니티나 메신저로 공유된 링크는 아예 보이지 않습니다. 아무도 특정하지 못하는 숫자 하나가, 짐작보다 낫다고 봤습니다."
          />

          <h2>
            <T en="The app icons" ko="앱 아이콘에 대해" />
          </h2>
          <TBlock
            en="Each icon comes from that app's own App Store or Google Play listing, and we serve it from here rather than linking to Apple's or Google's servers — that way opening this page does not tell them you did. The icons are their owners' trademarks, shown unaltered and only to identify the app being described. Nothing here is endorsed by, or affiliated with, any of these companies."
            ko="아이콘은 각 앱의 App Store·Google Play 등록 정보에서 가져왔고, 애플·구글 서버에 링크하지 않고 이 사이트에서 직접 내보냅니다. 그래야 이 페이지를 열었다는 사실이 그쪽에 넘어가지 않습니다. 아이콘은 각 회사의 상표이며, 어떤 앱을 말하는지 가리키기 위해서만 원본 그대로 씁니다. 여기 있는 어떤 회사와도 제휴 관계가 없고, 어느 곳의 승인도 받지 않았습니다."
          />
          <TBlock
            en={`If you own one of these marks and would rather it not appear here, email ${SITE.contact} and it will be taken down.`}
            ko={`권리자이시고 아이콘을 빼기를 원하시면 ${SITE.contact} 으로 알려주시면 내리겠습니다.`}
          />

          <h2>
            <T en="What each value means" ko="각 값이 뜻하는 것" />
          </h2>

          <div className="tablewrap">
            <table className="datatable">
            <thead>
              <tr>
                <th>
                  <T en="Question" ko="질문" />
                </th>
                <th>
                  <T en="How it is checked" ko="확인하는 법" />
                </th>
                <th>
                  <T en="What it does not tell you" ko="알 수 없는 것" />
                </th>
              </tr>
            </thead>
            <tbody>
              {SIGNALS.map((s) => (
                <tr key={s.q.en}>
                  <td>
                    <strong>
                      <T {...s.q} />
                    </strong>
                  </td>
                  <td>
                    <T {...s.how} />
                  </td>
                  <td>
                    <T {...s.limit} />
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>

          <h2>
            <T en="How far to trust a value" ko="값을 얼마나 믿을 수 있나" />
          </h2>

          <table className="datatable">
            <tbody>
              {TRUST.map((t) => (
                <tr key={t.tag.en}>
                  <td>
                    <T {...t.tag} />
                  </td>
                  <td>
                    <T {...t.means} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2>
            <T en="Where this is weak" ko="약한 곳" />
          </h2>

          <ul>
            <li>
              <strong>
                <T
                  en="The measuring machine sits in a datacentre."
                  ko="확인하는 서버가 데이터센터에 있습니다."
                />
              </strong>{' '}
              <T
                en="Plenty of Korean sites treat datacentre addresses differently from home broadband or a roaming SIM. When one does not answer, two causes are in play at once: being outside Korea, and being on a datacentre address. A single run cannot separate them."
                ko="한국 사이트 상당수가 데이터센터 IP를 가정용 인터넷이나 로밍 회선과 다르게 취급합니다. 응답이 없을 때 원인이 둘입니다. 한국 밖이라서, 그리고 데이터센터라서. 한 번 돌려서는 둘을 가를 수 없습니다."
              />
            </li>
            <li>
              <strong>
                <T en="Pages that build themselves in the browser." ko="브라우저에서 조립되는 페이지." />
              </strong>{' '}
              <T
                en="Some sign-up screens render differently between two visits, so a value can move without the company changing anything."
                ko="어떤 가입 화면은 들어갈 때마다 다르게 그려집니다. 회사가 아무것도 안 바꿔도 값이 움직일 수 있습니다."
              />
            </li>
            <li>
              <strong>
                <T
                  en={`${nBlocked} of ${n} services cannot be measured by machine at all.`}
                  ko={`${n}개 중 ${nBlocked}개는 기계로 아예 확인할 수 없습니다.`}
                />
              </strong>{' '}
              <T
                en="Blocked by robots.txt, refused outright, silent, or serving a certificate that will not verify. For those, first-hand reports are the only source there is."
                ko="robots.txt로 막혔거나, 거부당했거나, 응답이 없거나, 인증서가 검증되지 않습니다. 이런 곳은 직접 겪은 사람의 제보 말고는 채울 방법이 없습니다."
              />
            </li>
            <li>
              <strong>
                <T en="A value describes one moment." ko="값은 한 순간을 설명합니다." />
              </strong>{' '}
              <T
                en="It says what was true at the timestamp next to it and nothing else, which is why the timestamp is never hidden."
                ko="옆에 적힌 시각에 그랬다는 뜻이고 그 이상은 아닙니다. 시각을 숨기지 않는 이유입니다."
              />
            </li>
          </ul>

          {run && (
            <>
              <h2>
                <T en="Latest run" ko="가장 최근 확인" />
              </h2>
              <table className="datatable">
                <tbody>
                  <tr>
                    <td>
                      <T en="Finished" ko="끝난 시각" />
                    </td>
                    <td className="mono">{formatUtc(run.finished_at)}</td>
                  </tr>
                  <tr>
                    <td>
                      <T en="Measured from" ko="확인한 곳" />
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
                      <T en="Duration" ko="걸린 시간" />
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
            </>
          )}

          <h2>
            <T en="Corrections" ko="정정" />
          </h2>
          <TBlock
            en="Every value is published with the raw evidence under it so it can be contradicted. If one is wrong, say what you saw and it gets corrected with its source recorded. This site describes what was observed at a point in time. It does not rate, rank, or recommend."
            ko="모든 값 아래에 원본 근거를 붙여 둔 것은 반박당하기 위해서입니다. 틀린 값이 있으면 무엇을 보셨는지 알려주세요. 근거와 함께 고칩니다. 이 사이트는 특정 시점에 관측된 것을 적을 뿐, 서비스를 평가하거나 순위를 매기거나 추천하지 않습니다."
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
