import type { Metadata } from 'next';
import { getBlockCounts, getBlockedServices, getServices } from '@/lib/data';
import { Only, T, TBlock, type Bi } from '@/lib/i18n';
import { SITE, type ReportKind, reportUrl } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Report what happened',
  description:
    'Two of the eight questions can only be answered by people who actually tried. No account, no email, no personal details — the form does not have a field for them.',
};

const FORMS: { kind: ReportKind; title: Bi; body: Bi; cta: Bi }[] = [
  {
    kind: 'foreign-card',
    title: { en: 'A foreign card', ko: '해외 발급 카드' },
    body: {
      en: 'You tried to pay with a card issued outside Korea. Did it go through, or did it bounce? Tell us the issuing country and the brand — never the number.',
      ko: '한국 밖에서 발급된 카드로 결제를 시도해 보셨나요? 됐는지 튕겼는지 알려주세요. 발급 국가와 브랜드만 받습니다 — 번호는 절대 받지 않습니다.',
    },
    cta: { en: 'Report a card payment', ko: '카드 결제 제보하기' },
  },
  {
    kind: 'foreign-sms',
    title: { en: 'A text to a foreign number', ko: '해외 번호로 온 문자' },
    body: {
      en: 'You asked for a verification code on a non-Korean number. Did it arrive, did nothing come, or would the form not even accept the number? Country only.',
      ko: '한국 번호가 아닌 곳으로 인증번호를 요청해 보셨나요? 도착했는지, 오지 않았는지, 아니면 번호 입력 자체가 막혔는지 알려주세요. 국가만 받습니다.',
    },
    cta: { en: 'Report an SMS attempt', ko: '문자 인증 제보하기' },
  },
  {
    kind: 'correction',
    title: { en: 'Something here is wrong', ko: '여기 틀린 게 있다' },
    body: {
      en: 'A value on the site does not match what you saw. Every value is published with its raw evidence exactly so that it can be contradicted. Point at the page and say what you saw.',
      ko: '사이트의 값이 직접 보신 것과 다릅니다. 모든 값은 반박당할 수 있도록 원본 근거와 함께 공개돼 있습니다. 어느 페이지인지와 무엇을 보셨는지 알려주세요.',
    },
    cta: { en: 'Send a correction', ko: '정정 요청 보내기' },
  },
];

export default async function ReportPage() {
  const [services, blocked, counts] = await Promise.all([
    getServices(),
    getBlockedServices(),
    getBlockCounts(),
  ]);
  const live = reportUrl('foreign-card') !== null;

  return (
    <>
      <section className="hero hero-narrow">
        <div className="wrap">
          <h1>
            <T en="Tell us what actually happened" ko="실제로 무슨 일이 있었는지 알려주세요" />
          </h1>
          <TBlock
            className="standfirst"
            en={`Two of the eight questions on this site cannot be answered by a machine, and ${blocked.length} of the ${services.length} services cannot be measured by one at all. For those, a first-hand account is not a nice extra. It is the only source there is.`}
            ko={`이 사이트의 여덟 개 질문 중 둘은 기계가 답할 수 없고, ${services.length}개 서비스 중 ${blocked.length}개는 기계로 아예 잴 수 없습니다. 그런 항목에 직접 겪은 이야기는 있으면 좋은 것이 아니라 유일한 데이터원입니다.`}
          />
        </div>
      </section>

      <div className="wrap">
        {!live && (
          <div className="aside warn">
            <h3>
              <T en="The report forms are not open yet." ko="제보 창구가 아직 열리지 않았습니다." />
            </h3>
            <T
              en="The intake pipeline is built and tested, but the public repository that receives the forms has not been created yet. Until then, corrections and reports are welcome by email and will be recorded the same way, with the same rule about personal details."
              ko="접수 파이프라인은 만들어 두고 시험까지 마쳤지만, 폼을 받을 공개 저장소를 아직 만들지 않았습니다. 그때까지는 이메일로 보내주시면 같은 방식으로 기록합니다. 개인정보에 대한 원칙도 같습니다."
            />
            <p style={{ marginTop: 14 }}>
              <a className="button" href={`mailto:${SITE.contact}`}>
                {SITE.contact}
              </a>
            </p>
          </div>
        )}

        <div className="cards">
          {FORMS.map((f) => {
            const href = reportUrl(f.kind);
            return (
              <article className="card" key={f.kind}>
                <h3>
                  <T {...f.title} />
                </h3>
                <p>
                  <T {...f.body} />
                </p>
                <div className="cta">
                  {href ? (
                    <a className="button" href={href} rel="noreferrer" target="_blank">
                      <T {...f.cta} />
                    </a>
                  ) : (
                    <a className="button ghost" href={`mailto:${SITE.contact}`}>
                      <T en="Email it instead" ko="이메일로 보내기" />
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <div className="prose" style={{ marginTop: 56, paddingBottom: 40 }}>
          <h2>
            <T en="We do not want your details" ko="개인정보를 받지 않습니다" />
          </h2>

          <Only lang="en">
            <p>
              There is no account to make and no email address to hand over. The forms have no field
              for your name, your contact details, your phone number, or your card number — not
              because we promise not to look, but because there is nowhere to put them.
            </p>
            <p>
              If free text arrives that looks like it contains any of those,{' '}
              <strong>the text is discarded before anything is written to disk</strong> and the report
              is sent back rather than stored. That check is automatic and errs on the side of
              throwing things away.
            </p>
            <p>
              This is not caution for its own sake. Korea&rsquo;s revised personal-information law
              takes effect on 11 September 2026, with a 72-hour breach-notification duty and penalties
              scaled to revenue. This project is run by one person. A database of personal details
              would be a pure liability, so there is not one.
            </p>
            <p>
              What is kept is what the site publishes: which service, what happened, the issuing
              country, the card brand, the date, and your GitHub username as the author of the report.
              Everything else goes in the bin.
            </p>
          </Only>

          <Only lang="ko">
            <p>
              만들 계정도, 넘길 이메일 주소도 없습니다. 폼에는 이름·연락처·전화번호·카드번호를 적을
              칸이 아예 없습니다. 안 보겠다고 약속하는 것이 아니라, 넣을 곳이 없습니다.
            </p>
            <p>
              자유 서술에 그런 것으로 보이는 내용이 들어오면{' '}
              <strong>디스크에 무엇이든 쓰기 전에 그 본문을 버리고</strong> 제보를 저장하지 않은 채
              돌려보냅니다. 이 검사는 자동이며, 애매하면 버리는 쪽으로 판단합니다.
            </p>
            <p>
              조심하려고 조심하는 것이 아닙니다. 개정 개인정보보호법이 2026년 9월 11일 시행되고,
              72시간 내 유출 통지 의무와 매출에 연동된 과징금이 따라옵니다. 이 프로젝트는 한 사람이
              운영합니다. 개인정보 데이터베이스는 순수한 부채라서, 만들지 않았습니다.
            </p>
            <p>
              남기는 것은 사이트에 공개되는 것과 같습니다. 어느 서비스인지, 무슨 일이 있었는지, 발급
              국가, 카드 브랜드, 날짜, 그리고 제보자로서의 GitHub 사용자명. 그 밖의 것은 버립니다.
            </p>
          </Only>

          <h2>
            <T en="What happens to a report" ko="제보가 거치는 길" />
          </h2>

          <Only lang="en">
            <ol>
              <li>The form is read automatically and turned into structured fields.</li>
              <li>
                Anything that looks like personal information is stripped, and that report is returned
                rather than recorded.
              </li>
              <li>
                Reports for the same service are combined. If two credible reports disagree, the value
                becomes <strong>reports disagree</strong> rather than one of them winning — a foreign
                card genuinely can work for one issuer and fail for another.
              </li>
              <li>
                The change opens as a pull request. Nothing reaches the site until a person has read it
                and approved it.
              </li>
              <li>
                On the site the value is marked <strong>reported by people</strong>, with the dates it
                was tried and a link to every report behind it.
              </li>
            </ol>
          </Only>

          <Only lang="ko">
            <ol>
              <li>폼을 자동으로 읽어 구조화된 항목으로 바꿉니다.</li>
              <li>
                개인정보로 보이는 것은 걸러내고, 그런 제보는 기록하지 않고 돌려보냅니다.
              </li>
              <li>
                같은 서비스의 제보끼리 모읍니다. 믿을 만한 제보 둘이 엇갈리면 한쪽이 이기는 것이
                아니라 <strong>제보가 엇갈림</strong>으로 남습니다. 해외 카드는 발급사에 따라 되기도
                하고 안 되기도 하는 게 실제로 정상입니다.
              </li>
              <li>
                변경은 풀 리퀘스트로 열립니다. 사람이 읽고 승인하기 전에는 사이트에 올라가지 않습니다.
              </li>
              <li>
                사이트에서는 <strong>사람이 제보</strong>로 표시되고, 시도한 날짜와 근거가 된 제보
                링크가 함께 붙습니다.
              </li>
            </ol>
          </Only>

          <h2>
            <T en="What is most useful right now" ko="지금 가장 도움이 되는 것" />
          </h2>
          <TBlock
            en={`${counts['robots-disallow']} services block our crawler in robots.txt and we obey it; ${counts['bot-block']} refuse it outright; ${counts.unreachable} never answered from outside Korea at all. Those are exactly the services nobody can measure for you — and several of them are the ones you are most likely to need in your first week here.`}
            ko={`${counts['robots-disallow']}개 서비스가 robots.txt로 우리 크롤러를 막고 있고 우리는 그것을 지킵니다. ${counts['bot-block']}개는 아예 거부하고, ${counts.unreachable}개는 한국 밖에서 보낸 요청에 응답조차 하지 않았습니다. 바로 그 서비스들이 누구도 대신 재줄 수 없는 것들이고, 그중 몇은 한국에 온 첫 주에 가장 먼저 쓰게 되는 것들입니다.`}
          />
        </div>
      </div>
    </>
  );
}
