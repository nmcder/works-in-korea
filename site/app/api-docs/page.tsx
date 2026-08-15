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
  "evidence": { "...": "what the probe actually saw" }
}`}</pre>

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
