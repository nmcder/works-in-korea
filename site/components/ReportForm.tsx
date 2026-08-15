'use client';

import { useEffect, useRef, useState } from 'react';
import { useLang } from '@/components/use-lang';
import { T, type Bi } from '@/lib/i18n';

export interface ServiceOption {
  id: string;
  name: string;
}

type Kind = 'foreign-card' | 'foreign-sms' | 'correction';

const KINDS: { id: Kind; label: Bi; blurb: Bi }[] = [
  {
    id: 'foreign-card',
    label: { en: 'A foreign card', ko: '해외 발급 카드' },
    blurb: {
      en: 'You paid with a card issued outside Korea.',
      ko: '한국 밖에서 발급된 카드로 결제해 보셨나요?',
    },
  },
  {
    id: 'foreign-sms',
    label: { en: 'A text to a foreign number', ko: '해외 번호로 온 문자' },
    blurb: {
      en: 'You asked for a verification code on a non-Korean number.',
      ko: '한국 번호가 아닌 곳으로 인증번호를 받아 보셨나요?',
    },
  },
  {
    id: 'correction',
    label: { en: 'Something here is wrong', ko: '여기 틀린 게 있다' },
    blurb: {
      en: 'A value on the site does not match what you saw.',
      ko: '사이트의 값이 직접 보신 것과 다릅니다.',
    },
  },
];

const CARD_OUTCOMES: { id: string; label: Bi }[] = [
  { id: 'works', label: { en: 'It went through', ko: '결제됐습니다' } },
  { id: 'fails', label: { en: 'It was rejected', ko: '거절됐습니다' } },
  { id: 'mixed', label: { en: 'It worked only sometimes', ko: '될 때도 있고 안 될 때도 있었습니다' } },
];

const SMS_OUTCOMES: { id: string; label: Bi }[] = [
  { id: 'works', label: { en: 'The code arrived', ko: '인증번호가 왔습니다' } },
  { id: 'fails', label: { en: 'Nothing arrived', ko: '오지 않았습니다' } },
  { id: 'rejected', label: { en: 'The form would not accept my number', ko: '번호 입력부터 막혔습니다' } },
  { id: 'mixed', label: { en: 'It arrived only sometimes', ko: '올 때도 있고 안 올 때도 있었습니다' } },
];

const SIGNALS: { id: string; label: Bi }[] = [
  { id: 'Access from abroad', label: { en: 'Opens from outside Korea', ko: '해외 접속' } },
  { id: 'Interface languages', label: { en: 'Interface languages', ko: '인터페이스 언어' } },
  { id: 'Korean phone verification at sign-up', label: { en: 'Sign-up needs a Korean phone', ko: '가입 시 한국 휴대폰' } },
  { id: 'Mobile apps', label: { en: 'Mobile apps', ko: '모바일 앱' } },
  { id: 'Payment services', label: { en: 'Payment services', ko: '결제사' } },
  { id: 'English customer support', label: { en: 'English support', ko: '영어 고객지원' } },
  { id: 'Something else', label: { en: 'Something else', ko: '그 밖의 것' } },
];

export function ReportForm({
  services,
  initialKind,
  initialService,
}: {
  services: ServiceOption[];
  initialKind?: Kind;
  initialService?: string;
}) {
  const lang = useLang();
  const mountedAt = useRef(Date.now());
  const [kind, setKind] = useState<Kind>(initialKind ?? 'foreign-card');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<Bi | null>(null);

  // 뒤로 갔다가 돌아오면 타이머가 멈춰 있어서 정상 제출이 "너무 빠름"으로 걸린다
  useEffect(() => {
    mountedAt.current = Date.now();
  }, [kind]);

  const outcomes = kind === 'foreign-card' ? CARD_OUTCOMES : SMS_OUTCOMES;

  async function submit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setError(null);
    setSending(true);

    const f = new FormData(e.currentTarget);
    const payload = {
      kind,
      service: String(f.get('service') ?? ''),
      outcome: String(f.get('outcome') ?? ''),
      country: String(f.get('country') ?? ''),
      brand: String(f.get('brand') ?? ''),
      triedOn: String(f.get('triedOn') ?? ''),
      signal: String(f.get('signal') ?? ''),
      observed: String(f.get('observed') ?? ''),
      details: String(f.get('details') ?? ''),
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
          <T
            en="A person reads every report before anything changes on the site. If it holds up, the value will carry your report as its source."
            ko="사이트에 반영되기 전에 사람이 모든 제보를 읽습니다. 확인되면 그 값의 근거로 이 제보가 붙습니다."
          />
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
            <T en="Report another" ko="하나 더 제보하기" />
          </button>
        </p>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={submit}>
      <fieldset className="form-kinds">
        <legend className="form-label">
          <T en="What are you telling us about?" ko="무엇에 대한 제보인가요?" />
        </legend>
        <div className="chips">
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              className="chip"
              aria-pressed={kind === k.id}
              onClick={() => setKind(k.id)}
            >
              <T {...k.label} />
            </button>
          ))}
        </div>
        <p className="form-hint">
          <T {...(KINDS.find((k) => k.id === kind)?.blurb ?? KINDS[0]!.blurb)} />
        </p>
      </fieldset>

      <label className="field">
        <span className="form-label">
          <T en="Which service?" ko="어느 서비스인가요?" />
        </span>
        <select name="service" defaultValue={initialService ?? ''} required>
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

      {kind !== 'correction' && (
        <fieldset className="field">
          <legend className="form-label">
            <T en="What happened?" ko="어떻게 됐나요?" />
          </legend>
          <div className="radios">
            {outcomes.map((o, i) => (
              <label key={o.id} className="radio">
                <input type="radio" name="outcome" value={o.id} required defaultChecked={i === -1} />
                <T {...o.label} />
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {kind === 'foreign-card' && (
        <div className="field-row">
          <label className="field">
            <span className="form-label">
              <T en="Country that issued the card" ko="카드 발급 국가" />
            </span>
            <input name="country" type="text" maxLength={56} placeholder={lang === 'ko' ? '미국' : 'United States'} />
          </label>
          <label className="field">
            <span className="form-label">
              <T en="Card brand" ko="카드 브랜드" />
            </span>
            <input name="brand" type="text" maxLength={32} placeholder="Visa" />
          </label>
        </div>
      )}

      {kind === 'foreign-sms' && (
        <label className="field">
          <span className="form-label">
            <T en="Country of the phone number" ko="전화번호 국가" />
          </span>
          <input name="country" type="text" maxLength={56} placeholder={lang === 'ko' ? '미국' : 'United States'} />
        </label>
      )}

      {kind === 'correction' && (
        <>
          <label className="field">
            <span className="form-label">
              <T en="Which value is wrong?" ko="어느 값이 틀렸나요?" />
            </span>
            <select name="signal" defaultValue="">
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
            <textarea name="observed" rows={4} maxLength={1200} required />
          </label>
        </>
      )}

      <label className="field">
        <span className="form-label">
          <T en="When did you try?" ko="언제 해보셨나요?" />
          <em>
            <T en="optional" ko="선택" />
          </em>
        </span>
        <input name="triedOn" type="date" />
      </label>

      <label className="field">
        <span className="form-label">
          <T en="Anything else?" ko="더 알려주실 것이 있나요?" />
          <em>
            <T en="optional" ko="선택" />
          </em>
        </span>
        <textarea name="details" rows={3} maxLength={1200} />
      </label>

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
          {sending ? (
            <T en="Sending…" ko="보내는 중…" />
          ) : (
            <T en="Send report" ko="제보 보내기" />
          )}
        </button>
      </p>
    </form>
  );
}
