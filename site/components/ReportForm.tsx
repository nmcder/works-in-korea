'use client';

/**
 * 제보 폼.
 *
 * 전에는 첫 화면부터 "해외 카드 / 해외 문자 / 틀린 값" 셋 중에 고르라고 했다.
 * 그건 **우리가 비어 있는 칸** 기준이지 사람이 찾아온 이유가 아니다.
 * 실제로 오는 사람은 넷 중 하나다.
 *
 *   1. 직접 해봤다 — 되는지 안 되는지 겪은 그대로 알려주러
 *   2. 여기 적힌 게 틀렸다 — 고쳐 달라고
 *   3. 찾는 서비스가 없다 — 추가해 달라고
 *   4. 사이트 자체에 할 말이 있다 — 기능이든 오작동이든
 *
 * 1번을 고른 사람에게만 "무엇을 해보셨나요"를 묻고, 거기 맞는 선택지를 낸다.
 * 카드 결제하러 온 게 아닌 사람에게 "결제됐습니다 / 거절됐습니다"를 보이면
 * 자기 얘기가 아니라고 판단하고 그냥 나간다.
 *
 * 3·4번은 측정값이 아니라 우리에게 하는 말이라서 `report` 라벨을 붙이지 않는다.
 * 수집기가 가져가지 않고 이슈로만 남는다 (route.ts 주석 참고).
 */

import { useEffect, useRef, useState } from 'react';
import { useLang } from '@/components/use-lang';
import { T, type Bi } from '@/lib/i18n';

export interface ServiceOption {
  id: string;
  name: string;
}

export type Intent = 'experience' | 'correction' | 'new-service' | 'site-feedback';

/** 직접 해본 것 중 무엇에 대한 이야기인가 */
type Topic =
  | 'overseas-access'
  | 'languages'
  | 'signup'
  | 'foreign-card'
  | 'foreign-sms'
  | 'support-en';

/** cta 는 단추에 쓴다 — 고를 때의 이름("사이트에 대한 의견")을 단추에 그대로 쓰면
 *  누르는 것이 아니라 읽는 제목처럼 보인다. 단추에는 동사가 있어야 한다. */
const INTENTS: { id: Intent; label: Bi; blurb: Bi; cta: Bi; icon: string }[] = [
  {
    id: 'experience',
    label: { en: 'I tried it myself', ko: '직접 해봤어요' },
    blurb: {
      en: 'You used a Korean service from abroad, or without a Korean phone or card, and something happened.',
      ko: '한국 서비스를 해외에서, 또는 한국 휴대폰·카드 없이 써 보셨나요? 겪은 그대로면 됩니다.',
    },
    cta: { en: 'Send what happened', ko: '겪은 일 보내기' },
    icon: 'M4 10.5 8 14l8-9',
  },
  {
    id: 'correction',
    label: { en: 'Something here is wrong', ko: '여기 적힌 게 틀렸어요' },
    blurb: {
      en: 'A value on this site does not match what you saw with your own eyes.',
      ko: '이 사이트의 값이 직접 보신 것과 다릅니다.',
    },
    cta: { en: 'Send the correction', ko: '정정 요청 보내기' },
    icon: 'M10 3v8M10 15v.5',
  },
  {
    id: 'new-service',
    label: { en: 'A service is missing', ko: '찾는 서비스가 없어요' },
    blurb: {
      en: 'You looked for a Korean service and it is not on the list yet.',
      ko: '찾아봤는데 목록에 없는 서비스가 있습니다.',
    },
    cta: { en: 'Suggest this service', ko: '이 서비스 알려주기' },
    icon: 'M10 4v12M4 10h12',
  },
  {
    id: 'site-feedback',
    label: { en: 'About this site', ko: '사이트에 대한 의견' },
    blurb: {
      en: 'Something is confusing, broken, or missing — about the site itself, not about a Korean service.',
      ko: '헷갈리거나, 망가졌거나, 있었으면 하는 것. 한국 서비스가 아니라 이 사이트 이야기입니다.',
    },
    cta: { en: 'Send feedback', ko: '의견 보내기' },
    icon: 'M4 5h12v8H8l-4 3V5Z',
  },
];

const TOPICS: { id: Topic; label: Bi; question: Bi }[] = [
  {
    id: 'overseas-access',
    label: { en: 'Opening it from outside Korea', ko: '해외에서 접속' },
    question: { en: 'Did the site open?', ko: '접속이 됐나요?' },
  },
  {
    id: 'languages',
    label: { en: 'What language the screen was in', ko: '화면에 나온 언어' },
    question: { en: 'What could you read it in?', ko: '어떤 언어로 볼 수 있었나요?' },
  },
  {
    id: 'signup',
    label: { en: 'Signing up', ko: '가입' },
    question: { en: 'Could you finish signing up?', ko: '가입을 끝낼 수 있었나요?' },
  },
  {
    id: 'foreign-card',
    label: { en: 'Paying with a non-Korean card', ko: '해외 발급 카드로 결제' },
    question: { en: 'Did the payment go through?', ko: '결제가 됐나요?' },
  },
  {
    id: 'foreign-sms',
    label: { en: 'A code sent to a non-Korean number', ko: '해외 번호로 인증번호' },
    question: { en: 'Did the code arrive?', ko: '인증번호가 왔나요?' },
  },
  {
    id: 'support-en',
    label: { en: 'Getting help in English', ko: '영어로 문의' },
    question: { en: 'Did you get an answer in English?', ko: '영어로 답을 받으셨나요?' },
  },
];

/*
 * ⚠️ foreign-card 와 foreign-sms 의 id 는 서버(app/api/report/route.ts)가
 * 정해진 영어 문장으로 바꾸고, 엔진의 readOutcome() 이 그 문장을 보고
 * works/fails/mixed 를 가른다. 세 곳이 한 줄로 묶여 있으니 함부로 바꾸지 말 것.
 * 나머지 항목은 사람이 읽고 처리하므로 문구가 자유롭다.
 */
const OUTCOMES: Record<Topic, { id: string; label: Bi }[]> = {
  'overseas-access': [
    { id: 'works', label: { en: 'It opened normally', ko: '평소처럼 열렸습니다' } },
    { id: 'fails', label: { en: 'It never loaded', ko: '아예 열리지 않았습니다' } },
    { id: 'blocked', label: { en: 'It said my country is not allowed', ko: '해당 국가에서는 이용할 수 없다고 나왔습니다' } },
    { id: 'mixed', label: { en: 'It opened but parts did not work', ko: '열리긴 했는데 일부가 안 됐습니다' } },
  ],
  languages: [
    { id: 'en', label: { en: 'English was available', ko: '영어가 있었습니다' } },
    { id: 'ko-only', label: { en: 'Korean only', ko: '한국어뿐이었습니다' } },
    { id: 'partial', label: { en: 'English on some pages, Korean on others', ko: '일부 화면만 영어였습니다' } },
    { id: 'other', label: { en: 'Another language was available', ko: '다른 언어가 있었습니다' } },
  ],
  signup: [
    { id: 'ok', label: { en: 'I signed up without a Korean phone', ko: '한국 휴대폰 없이 가입했습니다' } },
    { id: 'needs-phone', label: { en: 'It demanded Korean phone verification', ko: '한국 휴대폰 본인인증을 요구했습니다' } },
    { id: 'alt', label: { en: 'It accepted a passport or residence card instead', ko: '여권이나 외국인등록증으로 대신 됐습니다' } },
    { id: 'blocked-other', label: { en: 'It blocked me for some other reason', ko: '다른 이유로 막혔습니다' } },
  ],
  'foreign-card': [
    { id: 'works', label: { en: 'It went through', ko: '결제됐습니다' } },
    { id: 'fails', label: { en: 'It was rejected', ko: '거절됐습니다' } },
    { id: 'mixed', label: { en: 'It worked only sometimes', ko: '될 때도 있고 안 될 때도 있었습니다' } },
  ],
  'foreign-sms': [
    { id: 'works', label: { en: 'The code arrived', ko: '인증번호가 왔습니다' } },
    { id: 'fails', label: { en: 'Nothing arrived', ko: '오지 않았습니다' } },
    { id: 'rejected', label: { en: 'It would not accept my number at all', ko: '번호 입력부터 막혔습니다' } },
    { id: 'mixed', label: { en: 'It arrived only sometimes', ko: '올 때도 있고 안 올 때도 있었습니다' } },
  ],
  'support-en': [
    { id: 'yes', label: { en: 'They answered in English', ko: '영어로 답을 받았습니다' } },
    { id: 'no', label: { en: 'Korean only', ko: '한국어로만 됐습니다' } },
    { id: 'none', label: { en: 'I asked in English and got no reply', ko: '영어로 물었는데 답이 없었습니다' } },
  ],
};

const SIGNALS: { id: string; label: Bi }[] = [
  { id: 'Access from abroad', label: { en: 'Opens from outside Korea', ko: '해외 접속' } },
  { id: 'Interface languages', label: { en: 'Interface languages', ko: '인터페이스 언어' } },
  {
    id: 'Korean phone verification at sign-up',
    label: { en: 'Sign-up needs a Korean phone', ko: '가입 시 한국 휴대폰' },
  },
  { id: 'Mobile apps', label: { en: 'Mobile apps', ko: '모바일 앱' } },
  { id: 'Payment services', label: { en: 'Payment services', ko: '결제사' } },
  { id: 'English customer support', label: { en: 'English support', ko: '영어 고객지원' } },
  { id: 'The name, link or category', label: { en: 'The name, link or category', ko: '이름·주소·분류' } },
  { id: 'Something else', label: { en: 'Something else', ko: '그 밖의 것' } },
];

/** 서비스를 골라야 하는 종류인가 */
const NEEDS_SERVICE: Record<Intent, boolean> = {
  experience: true,
  correction: true,
  'new-service': false,
  'site-feedback': false,
};

export function ReportForm({
  services,
  initialIntent,
  initialService,
}: {
  services: ServiceOption[];
  initialIntent?: Intent;
  initialService?: string;
}) {
  const lang = useLang();
  const mountedAt = useRef(Date.now());
  const [intent, setIntent] = useState<Intent>(initialIntent ?? 'experience');
  const [topic, setTopic] = useState<Topic>('overseas-access');
  const [service, setService] = useState(initialService ?? '');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<Bi | null>(null);

  /*
   * 서비스 페이지에서 "이 값이 틀렸나요?"를 누르고 온 사람에게 서비스를 다시 고르게
   * 하지 않는다. 페이지 자체는 정적으로 두어야 하므로(서버 0대 원칙) 주소를 서버에서
   * 읽지 않고 여기서 읽는다.
   */
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const s = q.get('service');
    const i = q.get('intent');
    if (s && services.some((x) => x.id === s)) setService(s);
    if (i && i in NEEDS_SERVICE) setIntent(i as Intent);
    const t = q.get('topic');
    if (t && TOPICS.some((x) => x.id === t)) {
      setTopic(t as Topic);
      if (!i) setIntent('experience');
    }
  }, [services]);

  // 뒤로 갔다가 돌아오면 타이머가 멈춰 있어서 정상 제출이 "너무 빠름"으로 걸린다
  useEffect(() => {
    mountedAt.current = Date.now();
    setError(null);
  }, [intent]);

  async function submit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setSending(true);

    const f = new FormData(e.currentTarget);
    const payload = {
      intent,
      topic: intent === 'experience' ? topic : null,
      service: NEEDS_SERVICE[intent] ? service : '',
      outcome: String(f.get('outcome') ?? ''),
      country: String(f.get('country') ?? ''),
      brand: String(f.get('brand') ?? ''),
      triedOn: String(f.get('triedOn') ?? ''),
      signal: String(f.get('signal') ?? ''),
      observed: String(f.get('observed') ?? ''),
      details: String(f.get('details') ?? ''),
      serviceName: String(f.get('serviceName') ?? ''),
      serviceUrl: String(f.get('serviceUrl') ?? ''),
      page: String(f.get('page') ?? ''),
      website: String(f.get('website') ?? ''),
      elapsed: Date.now() - mountedAt.current,
    };

    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok: boolean; url?: string; message?: Bi };
      if (data.ok) setDone(data.url ?? '');
      else setError(data.message ?? { en: 'Something went wrong.', ko: '문제가 생겼습니다.' });
    } catch {
      setError({
        en: 'Could not reach the server. Please try again.',
        ko: '서버에 닿지 못했습니다. 다시 시도해 주세요.',
      });
    } finally {
      setSending(false);
    }
  }

  if (done !== null) {
    return (
      <div className="form-done">
        <h2>
          <T en="Thank you — it is in." ko="고맙습니다. 접수됐습니다." />
        </h2>
        <p>
          {intent === 'experience' || intent === 'correction' ? (
            <T
              en="A person reads every report before anything changes on the site. If it holds up, the value will carry your report as its source."
              ko="사이트에 반영되기 전에 사람이 모든 제보를 읽습니다. 확인되면 그 값의 근거로 이 제보가 붙습니다."
            />
          ) : (
            <T
              en="This one goes to a person rather than into the data. There is no promise about when, but it will be read."
              ko="이건 데이터가 아니라 사람에게 갑니다. 언제까지라고 약속드릴 수는 없지만 반드시 읽습니다."
            />
          )}
        </p>
        <p className="form-actions">
          {done && (
            <a className="button ghost" href={done} rel="noreferrer" target="_blank">
              <T en="See your report" ko="접수된 내용 보기" />
            </a>
          )}
          <button
            type="button"
            className="button"
            onClick={() => {
              setDone(null);
              mountedAt.current = Date.now();
            }}
          >
            <T en="Send another" ko="하나 더 보내기" />
          </button>
        </p>
      </div>
    );
  }

  const current = INTENTS.find((k) => k.id === intent) ?? INTENTS[0]!;
  const currentTopic = TOPICS.find((t) => t.id === topic) ?? TOPICS[0]!;

  return (
    <form className="form" onSubmit={submit}>
      <fieldset className="form-kinds">
        <legend className="form-label">
          <T en="What would you like to tell us?" ko="어떤 이야기를 하러 오셨나요?" />
        </legend>

        <div className="picker">
          {INTENTS.map((k) => (
            <button
              key={k.id}
              type="button"
              className="pick"
              aria-pressed={intent === k.id}
              onClick={() => setIntent(k.id)}
            >
              <span className="pick-mark" aria-hidden>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor"
                  strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d={k.icon} />
                </svg>
              </span>
              <span className="pick-text">
                <b>
                  <T {...k.label} />
                </b>
                <em>
                  <T {...k.blurb} />
                </em>
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      {NEEDS_SERVICE[intent] && (
        <label className="field">
          <span className="form-label">
            <T en="Which service?" ko="어느 서비스인가요?" />
          </span>
          <select
            name="service"
            value={service}
            onChange={(e) => setService(e.target.value)}
            required
          >
            <option value="" disabled>
              {lang === 'ko' ? '고르세요' : 'Choose one'}
            </option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {intent === 'experience' && (
        <>
          <fieldset className="field">
            <legend className="form-label">
              <T en="What did you try?" ko="무엇을 해보셨나요?" />
            </legend>
            <div className="chips">
              {TOPICS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="chip"
                  aria-pressed={topic === t.id}
                  onClick={() => setTopic(t.id)}
                >
                  <T {...t.label} />
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="field">
            <legend className="form-label">
              <T {...currentTopic.question} />
            </legend>
            <div className="radios">
              {OUTCOMES[topic].map((o) => (
                <label key={o.id} className="radio">
                  <input type="radio" name="outcome" value={o.id} required />
                  <T {...o.label} />
                </label>
              ))}
            </div>
          </fieldset>

          {topic === 'foreign-card' && (
            <div className="field-row">
              <label className="field">
                <span className="form-label">
                  <T en="Country that issued the card" ko="카드 발급 국가" />
                </span>
                <input
                  name="country"
                  type="text"
                  maxLength={56}
                  placeholder={lang === 'ko' ? '미국' : 'United States'}
                />
              </label>
              <label className="field">
                <span className="form-label">
                  <T en="Card brand" ko="카드 브랜드" />
                  <em>
                    <T en="never the number" ko="번호는 적지 마세요" />
                  </em>
                </span>
                <input name="brand" type="text" maxLength={32} placeholder="Visa" />
              </label>
            </div>
          )}

          {topic === 'foreign-sms' && (
            <label className="field">
              <span className="form-label">
                <T en="Country of the phone number" ko="전화번호 국가" />
                <em>
                  <T en="the country, not the number" ko="번호가 아니라 국가만" />
                </em>
              </span>
              <input
                name="country"
                type="text"
                maxLength={56}
                placeholder={lang === 'ko' ? '미국' : 'United States'}
              />
            </label>
          )}
        </>
      )}

      {intent === 'correction' && (
        <>
          <label className="field">
            <span className="form-label">
              <T en="Which value is wrong?" ko="어느 값이 틀렸나요?" />
            </span>
            <select name="signal" defaultValue="" required>
              <option value="" disabled>
                {lang === 'ko' ? '고르세요' : 'Choose one'}
              </option>
              {SIGNALS.map((s) => (
                <option key={s.id} value={s.id}>
                  {lang === 'ko' ? s.label.ko : s.label.en}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="form-label">
              <T en="What did you actually see?" ko="직접 보신 것은 어땠나요?" />
            </span>
            <textarea
              name="observed"
              rows={4}
              maxLength={1200}
              required
              placeholder={
                lang === 'ko'
                  ? '어제 열어보니 영어 메뉴가 있었습니다. 오른쪽 위에 EN 단추가 있어요.'
                  : 'I opened it yesterday and there was an English menu — an EN button at the top right.'
              }
            />
          </label>
        </>
      )}

      {intent === 'new-service' && (
        <>
          <label className="field">
            <span className="form-label">
              <T en="What is it called?" ko="서비스 이름" />
            </span>
            <input
              name="serviceName"
              type="text"
              maxLength={80}
              required
              placeholder={lang === 'ko' ? '무신사' : 'Musinsa'}
            />
          </label>
          <label className="field">
            <span className="form-label">
              <T en="Its address" ko="주소" />
            </span>
            <input
              name="serviceUrl"
              type="url"
              maxLength={300}
              required
              placeholder="https://…"
            />
          </label>
        </>
      )}

      {intent === 'site-feedback' && (
        <>
          <label className="field">
            <span className="form-label">
              <T en="Which page?" ko="어느 화면인가요?" />
              <em>
                <T en="optional" ko="선택" />
              </em>
            </span>
            <input
              name="page"
              type="text"
              maxLength={200}
              placeholder={lang === 'ko' ? '/changes 또는 쿠팡 상세 페이지' : '/changes, or the Coupang page'}
            />
          </label>
          <label className="field">
            <span className="form-label">
              <T en="What happened, or what would help?" ko="무슨 일이 있었는지, 또는 무엇이 있으면 좋겠는지" />
            </span>
            <textarea
              name="observed"
              rows={5}
              maxLength={1200}
              required
              placeholder={
                lang === 'ko'
                  ? '휴대폰에서 표가 화면 밖으로 잘립니다. / 은행만 따로 골라 보고 싶어요.'
                  : 'The table runs off the screen on my phone. / I would like to filter to banks only.'
              }
            />
          </label>
        </>
      )}

      {intent === 'experience' && (
        <label className="field">
          <span className="form-label">
            <T en="When did you try?" ko="언제 해보셨나요?" />
            <em>
              <T en="optional, but it helps a lot" ko="선택 — 있으면 훨씬 정확해집니다" />
            </em>
          </span>
          <input name="triedOn" type="date" />
        </label>
      )}

      {intent !== 'site-feedback' && (
        <label className="field">
          <span className="form-label">
            <T en="Anything else?" ko="더 알려주실 것이 있나요?" />
            <em>
              <T en="optional" ko="선택" />
            </em>
          </span>
          <textarea name="details" rows={3} maxLength={1200} />
        </label>
      )}

      {/* 봇만 채우는 칸. 사람 눈에도 스크린리더에도 보이지 않는다. */}
      <div className="honeypot" aria-hidden>
        <label>
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <p className="form-privacy">
        <T
          en="No account, no email address. If the text you write looks like it contains personal details, it is rejected before anything is saved."
          ko="계정도 이메일도 받지 않습니다. 적으신 내용에 개인정보로 보이는 것이 있으면, 저장하기 전에 돌려보냅니다."
        />
      </p>

      {error && (
        <div className="form-error" role="alert">
          <T {...error} />
        </div>
      )}

      <p className="form-actions">
        <button type="submit" className="button" disabled={sending}>
          {sending ? <T en="Sending…" ko="보내는 중…" /> : <T {...current.cta} />}
        </button>
      </p>
    </form>
  );
}
