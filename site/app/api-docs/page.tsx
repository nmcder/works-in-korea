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
            en={`Everything on this site is a static JSON file you can fetch. No key, no sign-up, no rate limit — ${SITE.license.name}, just credit the source. If you are building something for people arriving in Korea, take it.`}
            ko={`이 사이트의 모든 데이터는 그냥 내려받을 수 있는 JSON 파일입니다. 키도 가입도 요청 제한도 없습니다. ${SITE.license.name} — 출처만 밝히면 됩니다. 한국에 오는 사람을 위한 무언가를 만들고 있다면 그냥 쓰세요.`}
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
                    en={`All ${services.length} services with all 8 signals — about ${recorded} recorded values.`}
                    ko={`${services.length}개 서비스 전체와 시그널 8종. 기록된 값 약 ${recorded}개.`}
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
                    en="Every value that has moved, grouped by date, newest first — each with the vantage point of the run that saw it."
                    ko="움직인 값 전체를 날짜별로, 최신 순으로. 각 항목에 그것을 관측한 실행의 측정 지점이 붙어 있습니다."
                  />
                </td>
              </tr>
              <tr>
                <td>
                  <a href="/api/v1/meta.json">/api/v1/meta.json</a>
                </td>
                <td>
                  <T
                    en="Dataset size, licence, and the last measurement run including where it ran from."
                    ko="데이터셋 크기, 라이선스, 마지막 측정 실행 정보(측정 지점 포함)."
                  />
                </td>
              </tr>
            </tbody>
          </table>

          <h2>
            <T en="The shape of a signal" ko="시그널의 모양" />
          </h2>
          <TBlock
            en="All eight signals on every service share this envelope. The value is never alone."
            ko="모든 서비스의 시그널 여덟 개가 같은 봉투를 씁니다. 값이 혼자 다니는 일은 없습니다."
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
            <T en="Three things to get right" ko="꼭 지켜야 할 세 가지" />
          </h2>

          <Only lang="en">
            <ul>
              <li>
                <strong>
                  <code>confidence: &quot;unknown&quot;</code> is not a negative result.
                </strong>{' '}
                It means we did not measure it. The <code>evidence</code> object says why — robots.txt,
                a refusal, no answer at all, an unknown URL, or evidence too weak to record. Rendering
                it as &ldquo;no&rdquo; turns our honesty into your misinformation.
              </li>
              <li>
                <strong>
                  Show <code>measured_at</code> wherever you show a value.
                </strong>{' '}
                A fact about a Korean sign-up flow has a shelf life. The timestamp is the part that
                makes it usable.
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
                재지 않았다는 뜻입니다. 왜 그런지는 <code>evidence</code>에 적혀 있습니다. robots.txt,
                거부 응답, 무응답, 주소 미상, 근거 부족 중 하나입니다. 이걸 &lsquo;아니오&rsquo;로
                표시하면 우리의 정직함이 당신 쪽의 잘못된 정보로 바뀝니다.
              </li>
              <li>
                <strong>
                  값을 보여줄 때 <code>measured_at</code>을 함께 보여주세요.
                </strong>{' '}
                한국 가입 절차에 관한 사실에는 유통기한이 있습니다. 그 값을 쓸 수 있게 만들어 주는
                것이 바로 이 시각입니다.
              </li>
              <li>
                <strong>결제사 목록이 비었다고 결제가 안 되는 게 아닙니다.</strong> 로그인 없이 열
                수 있는 페이지에서 탐지되지 않았다는 뜻입니다.
              </li>
            </ul>
          </Only>

          <h2>
            <T en="Licence" ko="라이선스" />
          </h2>
          <TBlock
            en="Creative Commons Attribution 4.0. Use it commercially, build on it, redistribute it — just say where it came from. If you do build something, tell us: corrections from people using the data in anger are the most useful kind."
            ko="Creative Commons Attribution 4.0. 상업적 이용·재배포·2차 창작 모두 됩니다. 출처만 밝혀 주세요. 뭔가 만드셨다면 알려주세요 — 실제로 쓰는 사람이 보내는 정정이 가장 정확합니다."
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
