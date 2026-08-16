import type { Metadata } from 'next';
import { getBlockCounts, getBlockedServices, getServices } from '@/lib/data';
import { ReportForm, type ServiceOption } from '@/components/ReportForm';
import { T, TBlock } from '@/lib/i18n';
import { SITE } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Report what happened',
  description:
    'Two of the eight questions can only be answered by people who actually tried. No account, no email, no personal details.',
};

export default async function ReportPage() {
  const [services, blocked, counts] = await Promise.all([
    getServices(),
    getBlockedServices(),
    getBlockCounts(),
  ]);
  // 창구가 붙어 있는지. 없으면 폼 대신 이메일을 안내한다.
  const live = Boolean(SITE.issuesRepo);
  const options: ServiceOption[] = services
    .map((s) => ({
      id: s.id,
      name: s.name.ko && s.name.ko !== s.name.en ? `${s.name.en} · ${s.name.ko}` : s.name.en,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));

  return (
    <>
      <section className="hero hero-narrow">
        <div className="wrap">
          <h1>
            <T en="Tell us what happened" ko="겪은 일을 알려주세요" />
          </h1>
          <TBlock
            className="standfirst"
            en={`${blocked.length} of the ${services.length} services here cannot be measured by a machine at all, and two of the eight questions never can be. For those, someone who actually tried is the only source there is. Corrections, missing services and anything about the site itself go through the same form.`}
            ko={`여기 있는 ${services.length}개 중 ${blocked.length}개는 기계로 아예 확인할 수 없고, 여덟 개 질문 중 둘은 어떤 경우에도 확인할 수 없습니다. 이런 것은 직접 해 본 사람 말고는 알 방법이 없습니다. 틀린 값을 고치거나, 빠진 서비스를 알려주거나, 사이트 자체에 대한 이야기도 같은 폼으로 받습니다.`}
          />
        </div>
      </section>

      <div className="wrap">
        {!live && (
          <div className="aside warn">
            <h3>
              <T en="The report desk is not connected yet." ko="제보 창구가 아직 연결되지 않았습니다." />
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

        {live && <ReportForm services={options} />}

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
            en="What is kept is what the site shows: which service, what happened, the issuing country, the card brand, and the date. Nothing identifies you — the form posts on your behalf, so not even a username is attached."
            ko="남기는 것은 사이트에 보이는 것과 같습니다. 어느 서비스인지, 무슨 일이 있었는지, 발급 국가, 카드 브랜드, 날짜. 제보자를 가리키는 것은 하나도 없습니다 — 폼이 대신 접수하므로 아이디조차 남지 않습니다."
          />

          <h2>
            <T en="What happens next" ko="제보가 거치는 길" />
          </h2>

          <ol>
            <li>
              <T
                en="You send the form on this page. No account, no email address."
                ko="이 페이지의 폼으로 보냅니다. 계정도 이메일도 받지 않습니다."
              />
            </li>
            <li>
              <T
                en="Anything resembling personal information is caught before the report leaves this page, and nothing is saved."
                ko="개인정보로 보이는 것은 제보가 이 페이지를 떠나기 전에 걸립니다. 아무것도 저장되지 않습니다."
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
