import type { Metadata } from 'next';
import { getCoverage, getServices } from '@/lib/data';
import { Only, T, TBlock } from '@/lib/i18n';
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
      <section className="hero hero-narrow">
        <div className="wrap">
          <h1>
            <T en="Take the data" ko="데이터 가져가기" />
          </h1>
          <TBlock
            className="standfirst"
            en={`All of it is a static JSON file you can fetch. No key, no sign-up, no rate limit. ${SITE.license.name}, just credit the source.`}
            ko={`전부 그냥 내려받을 수 있는 JSON 파일입니다. 키도 가입도 요청 제한도 없습니다. ${SITE.license.name}, 출처만 밝히면 됩니다.`}
          />
        </div>
      </section>

      <div className="wrap">
        <div className="prose">
          <h2>
            <T en="Endpoints" ko="엔드포인트" />
          </h2>
          <table className="datatable">
            <tbody>
              <tr>
                <td>
                  <a href="/api/v1/services.json">/api/v1/services.json</a>
                </td>
                <td>
                  <T
                    en={`All ${services.length} services, all 8 questions. About ${recorded} recorded values.`}
                    ko={`서비스 ${services.length}개 전체, 항목 8종. 기록된 값 약 ${recorded}개.`}
                  />
                </td>
              </tr>
              <tr>
                <td>
                  <a href={`/api/v1/services/${example?.id}.json`}>
                    /api/v1/services/{'{id}'}.json
                  </a>
                </td>
                <td>
                  <T
                    en="One service. The id is the slug in this site’s URLs."
                    ko="서비스 1건. id는 이 사이트 주소에 쓰인 것과 같습니다."
                  />
                </td>
              </tr>
              <tr>
                <td>
                  <a href="/api/v1/changes.json">/api/v1/changes.json</a>
                </td>
                <td>
                  <T
                    en="Every value that has moved, newest first, each with the place it was checked from."
                    ko="바뀐 값 전체를 날짜별 최신순으로. 각 항목에 어디서 확인한 것인지가 붙어 있습니다."
                  />
                </td>
              </tr>
              <tr>
                <td>
                  <a href="/api/v1/meta.json">/api/v1/meta.json</a>
                </td>
                <td>
                  <T
                    en="Dataset size, licence, and the last run including where it ran from."
                    ko="데이터 규모, 라이선스, 마지막 확인 정보(확인한 곳 포함)."
                  />
                </td>
              </tr>
            </tbody>
          </table>

          {/*
            챗봇에 "카카오T 외국인도 써?" 를 묻는 사람이 늘었다. 그때 챗봇은 웹을
            한두 번 긁어서 답하는데, 우리 데이터는 106장으로 흩어져 있고 한 장에
            근거 JSON 이 본문보다 크다. 긁는 쪽에 나쁜 모양이라 통짜 텍스트를 따로 둔다.
          */}
          <h2>
            <T en="For language models" ko="AI가 읽을 형태" />
          </h2>
          <TBlock
            en="Everything above is also published as plain text, in one file, with a legend explaining what each value means and one line asking not to read a missing value as a “no”. If you are pointing an assistant at this dataset, start here."
            ko="위의 것을 통짜 텍스트로도 냅니다. 파일 하나에 전부 들어 있고, 각 값이 무슨 뜻인지와 “빈칸을 아니오로 읽지 말 것”이 앞에 적혀 있습니다. AI에게 이 데이터를 물리려면 여기서 시작하면 됩니다."
          />
          <table className="datatable">
            <tbody>
              <tr>
                <td>
                  <a href="/llms.txt">/llms.txt</a>
                </td>
                <td>
                  <T
                    en="What this dataset is, how to read a value, and where everything lives."
                    ko="이 데이터가 무엇인지, 값을 어떻게 읽는지, 나머지는 어디 있는지."
                  />
                </td>
              </tr>
              <tr>
                <td>
                  <a href="/llms-full.txt">/llms-full.txt</a>
                </td>
                <td>
                  <T
                    en={`All ${services.length} services and every measured value in one file, with the reason beside anything left unknown.`}
                    ko={`서비스 ${services.length}개와 측정값 전부가 한 파일에. 비어 있는 항목에는 왜 비었는지가 붙어 있습니다.`}
                  />
                </td>
              </tr>
            </tbody>
          </table>

          <h2>
            <T en="The shape of a value" ko="값의 생김새" />
          </h2>
          <TBlock
            en="All eight questions use the same shape. A value never travels alone."
            ko="여덟 개 항목이 전부 같은 형태입니다. 값만 따로 있는 경우는 없습니다."
          />
          <pre>{`"signup_phone_auth": {
  "value": "required",
  "measured_at":     "2026-08-15T05:38:47.932Z",
  "first_seen_at":   "2026-08-15T04:15:30.926Z",
  "last_changed_at": "2026-08-15T04:15:30.926Z",
  "method": "auto:signup_phone_auth",
  "confidence": "auto",
  "evidence": { "...": "what the probe actually saw" },
  "source_url": "https://www.worksinkorea.com/service/coupang/#signup_phone_auth"
}`}</pre>
          {/*
            레코드 안에 URL 이 둘이라 헷갈릴 수 있다. 하나는 그 회사 것이고 하나는
            우리 것인데, 잘못 고르면 우리 데이터를 쓰면서 그 회사를 출처로 단다.
          */}
          <h2>
            <T en="Two URLs, and which one to cite" ko="주소가 둘인 이유" />
          </h2>
          <TBlock
            en="Each record carries url — the website being measured, which is not us — and source_url, our page for that service. Every signal carries its own source_url with an anchor, which opens on that one value with its evidence underneath. If you publish a value from here, source_url is the link, and the licence asks you to use it."
            ko="레코드마다 url 과 source_url 이 있습니다. url 은 측정 대상 서비스의 주소이고(우리가 아닙니다), source_url 은 그 서비스에 대한 우리 페이지입니다. 시그널마다도 각자의 source_url 이 있고, 열면 그 값 하나와 그 아래 근거로 바로 갑니다. 여기서 가져간 값을 어딘가에 실으신다면 source_url 이 그 링크이고, 라이선스가 요구하는 것도 그것입니다."
          />

          <h2>
            <T en="Three things to get right" ko="이것만은 지켜주세요" />
          </h2>

          <Only lang="en">
            <ul>
              <li>
                <strong>
                  <code>confidence: &quot;unknown&quot;</code> is not a negative result.
                </strong>{' '}
                It means it was not measured. The <code>evidence</code> object says why: robots.txt, a
                refusal, no answer at all, an unknown URL, or evidence too weak to record. Rendering it
                as &ldquo;no&rdquo; turns a recorded gap into a false claim.
              </li>
              <li>
                <strong>
                  Show <code>measured_at</code> wherever you show a value.
                </strong>{' '}
                Korean sign-up flows change often. Without the date a value is not usable.
              </li>
              <li>
                <strong>An empty gateway list does not mean you cannot pay.</strong> It means nothing
                was detected on pages reachable without logging in.
              </li>
            </ul>
          </Only>

          <Only lang="ko">
            <ul>
              <li>
                <strong>
                  <code>confidence: &quot;unknown&quot;</code>은 &lsquo;아니오&rsquo;가 아닙니다.
                </strong>{' '}
                확인하지 못했다는 뜻입니다. 이유는 <code>evidence</code>에 있습니다. robots.txt, 거부
                응답, 무응답, 주소 미상, 근거 부족 중 하나입니다. 이걸 &lsquo;아니오&rsquo;로 표시하면
                모른다고 적어 둔 것이 틀린 정보가 되어 버립니다.
              </li>
              <li>
                <strong>
                  값을 보여줄 때 <code>measured_at</code>을 함께 보여주세요.
                </strong>{' '}
                한국 서비스의 가입 절차는 자주 바뀝니다. 언제 확인한 값인지가 붙어야 쓸 수 있습니다.
              </li>
              <li>
                <strong>결제사 목록이 비었다고 결제가 안 되는 건 아닙니다.</strong> 로그인 없이 열리는
                페이지에서 못 찾았다는 뜻입니다.
              </li>
            </ul>
          </Only>

          <h2>
            <T en="Licence" ko="라이선스" />
          </h2>
          <TBlock
            en="Creative Commons Attribution 4.0. Use it commercially, build on it, redistribute it. Just say where it came from. If you build something, tell us. Corrections from people actually using the data are the most useful kind."
            ko="Creative Commons Attribution 4.0. 상업적 이용·재배포·2차 창작 모두 됩니다. 출처만 밝혀 주세요. 뭔가 만드셨다면 알려주세요. 실제로 써 본 사람이 보내는 정정이 가장 정확합니다."
          />
          <p style={{ marginTop: 18 }}>
            <a className="button ghost" href={SITE.license.url} rel="license noreferrer" target="_blank">
              {SITE.license.name} →
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
