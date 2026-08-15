import type { Metadata } from 'next';
import { getBlockCounts, getBlockedServices, getServices } from '@/lib/data';
import { T, TBlock, type Bi } from '@/lib/i18n';
import { SITE, type ReportKind, reportUrl } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Report what happened',
  description:
    'Two of the eight questions can only be answered by people who actually tried. No account, no email, no personal details.',
};

const FORMS: { kind: ReportKind; title: Bi; body: Bi; cta: Bi }[] = [
  {
    kind: 'foreign-card',
    title: { en: 'A foreign card', ko: '해외 발급 카드' },
    body: {
      en: 'You paid with a card issued outside Korea. Did it go through or bounce? Issuing country and brand only — never the number.',
      ko: '한국 밖에서 발급된 카드로 결제해 보셨나요? 됐는지 튕겼는지 알려주세요. 발급 국가와 브랜드만 받습니다. 번호는 받지 않습니다.',
    },
    cta: { en: 'Report a card payment', ko: '카드 결제 제보하기' },
  },
  {
    kind: 'foreign-sms',
    title: { en: 'A text to a foreign number', ko: '해외 번호로 온 문자' },
    body: {
      en: 'You asked for a code on a non-Korean number. Did it arrive, did nothing come, or would the form not take the number? Country only.',
      ko: '한국 번호가 아닌 곳으로 인증번호를 받아 보셨나요? 왔는지, 안 왔는지, 아니면 번호 입력부터 막혔는지 알려주세요. 국가만 받습니다.',
    },
    cta: { en: 'Report an SMS attempt', ko: '문자 인증 제보하기' },
  },
  {
    kind: 'correction',
    title: { en: 'Something here is wrong', ko: '여기 틀린 게 있다' },
    body: {
      en: 'A value does not match what you saw. Point at the page and say what it actually did.',
      ko: '사이트의 값이 직접 보신 것과 다릅니다. 어느 페이지인지, 실제로는 어땠는지 알려주세요.',
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
            <T en="Tell us what happened" ko="겪은 일을 알려주세요" />
          </h1>
          <TBlock
            className="standfirst"
            en={`Two of the eight questions cannot be answered by a machine, and ${blocked.length} of the ${services.length} services cannot be measured by one at all. For those, someone who actually tried is the only source there is.`}
            ko={`여덟 개 질문 중 둘은 기계가 답할 수 없고, 서비스 ${services.length}개 중 ${blocked.length}개는 기계로 아예 확인할 수 없습니다. 이런 항목은 직접 해 본 사람 말고는 알 방법이 없습니다.`}
          />
        </div>
      </section>

      <div className="wrap">
        {!live && (
          <div className="aside warn">
            <h3>
              <T en="The forms are not open yet." ko="제보 창구가 아직 열리지 않았습니다." />
            </h3>
            <T
              en="Until they are, send it by email and it gets recorded the same way, under the same rule about personal details."
              ko="열릴 때까지는 이메일로 보내주세요. 같은 방식으로 기록하고, 개인정보 원칙도 같습니다."
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
            <T en="No personal details" ko="개인정보를 받지 않습니다" />
          </h2>

          <TBlock
            en="There is no account and no email to hand over. The forms have no field for your name, contact, phone number, or card number. It is not a promise not to look; there is nowhere to put them."
            ko="만들 계정도, 넘길 이메일도 없습니다. 폼에 이름·연락처·전화번호·카드번호를 적을 칸이 아예 없습니다. 안 보겠다는 약속이 아니라 넣을 곳이 없습니다."
          />
          <TBlock
            en="If free text arrives that looks like it contains any of those, the text is thrown away before anything is written to disk and the report is returned rather than stored. The check is automatic and errs toward discarding."
            ko="자유 서술에 그런 내용이 보이면, 디스크에 무엇이든 쓰기 전에 본문을 버리고 저장하지 않은 채 돌려보냅니다. 자동으로 걸러내며 애매하면 버리는 쪽으로 판단합니다."
          />
          <TBlock
            en="Korea's revised personal-information law takes effect on 11 September 2026, with a 72-hour breach-notification duty and penalties scaled to revenue. This is run by one person. A database of personal details would be pure liability, so there is not one."
            ko="개정 개인정보보호법이 2026년 9월 11일 시행됩니다. 72시간 안에 유출을 알려야 하고, 과징금은 매출에 연동됩니다. 이 프로젝트는 한 사람이 운영합니다. 개인정보 데이터베이스는 부채일 뿐이라 만들지 않았습니다."
          />
          <TBlock
            en="What is kept is what the site shows: which service, what happened, the issuing country, the card brand, the date, and your GitHub username as the author."
            ko="남기는 것은 사이트에 보이는 것과 같습니다. 어느 서비스인지, 무슨 일이 있었는지, 발급 국가, 카드 브랜드, 날짜, 그리고 제보자 GitHub 아이디."
          />

          <h2>
            <T en="What happens next" ko="제보가 거치는 길" />
          </h2>

          <ol>
            <li>
              <T
                en="The form is read automatically and turned into structured fields."
                ko="폼을 자동으로 읽어 항목별로 정리합니다."
              />
            </li>
            <li>
              <T
                en="Anything resembling personal information is stripped, and that report is returned rather than recorded."
                ko="개인정보로 보이는 것은 걸러내고, 그런 제보는 기록하지 않고 돌려보냅니다."
              />
            </li>
            <li>
              <T
                en="Reports for the same service are combined. Two credible reports that disagree become “reports disagree” rather than one winning, because a foreign card genuinely can work with one issuer and fail with another."
                ko="같은 서비스의 제보를 모읍니다. 믿을 만한 제보가 엇갈리면 한쪽을 고르지 않고 ‘제보가 엇갈림’으로 남깁니다. 해외 카드는 발급사에 따라 되기도 하고 안 되기도 하는 게 정상입니다."
              />
            </li>
            <li>
              <T
                en="The change opens as a pull request. Nothing reaches the site until a person approves it."
                ko="변경은 풀 리퀘스트로 열립니다. 사람이 승인하기 전에는 사이트에 올라가지 않습니다."
              />
            </li>
            <li>
              <T
                en="On the site the value is marked as reported, with the dates and a link to every report behind it."
                ko="사이트에는 제보로 표시되고, 시도한 날짜와 근거가 된 제보 링크가 함께 붙습니다."
              />
            </li>
          </ol>

          <h2>
            <T en="What helps most right now" ko="지금 가장 도움이 되는 것" />
          </h2>
          <TBlock
            en={`${counts['robots-disallow']} services block the crawler in robots.txt and it obeys; ${counts['bot-block']} refuse it outright; ${counts.unreachable} never answered from outside Korea. Those are exactly the ones nobody can measure for you, and several are what you need in your first week here.`}
            ko={`${counts['robots-disallow']}개는 robots.txt로 크롤러를 막았고 규칙대로 따랐습니다. ${counts['bot-block']}개는 아예 거부했고, ${counts.unreachable}개는 한국 밖에서 보낸 요청에 답하지 않았습니다. 누구도 대신 확인해 줄 수 없는 것들이고, 그중 몇은 한국에 오면 첫 주에 바로 쓰게 되는 서비스입니다.`}
          />
        </div>
      </div>
    </>
  );
}
