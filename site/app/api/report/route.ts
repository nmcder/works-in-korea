/**
 * 제보 접수 창구.
 *
 * 왜 만들었나: 전에는 GitHub 이슈 폼으로만 받았다. 그러려면 제보자가 GitHub 계정을 만들고
 * 로그인해야 한다. 한국을 여행 중인 사람에게 그 문턱은 사실상 벽이고, 제보가 **유일한
 * 데이터원**인 40개 서비스가 그 벽 뒤에서 영원히 비어 있게 된다.
 *
 * 그래서 폼은 우리 사이트에 두고, 이 함수가 제보자 대신 이슈를 만든다.
 * 뒤쪽(수집 → 집계 → PR 승인)은 하나도 바뀌지 않는다. 이슈 본문 형식과 라벨을
 * 기존 파서(`src/lib/reports.ts`)가 읽던 그대로 맞춘다.
 *
 * 지키는 것 (절대규칙 2)
 *   - 계정도 이메일도 받지 않는다. 받을 칸이 없다.
 *   - 자유 서술은 GitHub 에 올리기 **전에** 검사하고, 걸리면 아무것도 만들지 않는다.
 *   - 이 함수는 아무것도 저장하지 않는다. 상태가 없다.
 */
import { NextResponse } from 'next/server';
import { HIT_LABELS, screenForPersonalData } from '@/lib/screen';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 빈 문자열은 미설정으로 본다 — Vercel 은 빈 변수를 빈 문자열로 준다 */
const envOr = (name: string): string | null => process.env[name]?.trim() || null;

const REPO = envOr('NEXT_PUBLIC_ISSUES_REPO');
const TOKEN = envOr('REPORTS_TOKEN');

/** 폼이 뜬 뒤 이만큼도 안 지나서 제출됐으면 사람이 아니다 */
const MIN_FILL_MS = 2500;
const MAX_DETAILS = 1200;

type Kind = 'foreign-card' | 'foreign-sms' | 'correction';

const LABELS: Record<Kind, string[]> = {
  'foreign-card': ['report', 'report:foreign_card'],
  'foreign-sms': ['report', 'report:foreign_phone_sms'],
  correction: ['report', 'report:correction'],
};

/**
 * 결과 문구는 마음대로 정할 수 없다. `readOutcome()` 이 이 문자열을 보고
 * works/fails/mixed 를 가른다. 여기를 고치면 저기도 같이 고쳐야 한다.
 */
const CARD_OUTCOMES: Record<string, string> = {
  works: 'It worked — the payment went through',
  fails: 'It failed — the card was rejected',
  mixed: 'Partly — it worked only sometimes',
};
const SMS_OUTCOMES: Record<string, string> = {
  works: 'The text arrived',
  fails: 'No text arrived',
  rejected: 'The form would not even accept the number',
  mixed: 'Partly — it arrived only sometimes',
};

const ID = /^[a-z0-9][a-z0-9-]{1,48}$/;
const COUNTRY = /^[A-Za-zÀ-ɏ .'-]{2,56}$/;
const BRAND = /^[A-Za-z0-9 .'-]{2,32}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function bad(message: { en: string; ko: string }, status = 400): NextResponse {
  return NextResponse.json({ ok: false, message }, { status });
}

interface Payload {
  kind?: unknown;
  service?: unknown;
  outcome?: unknown;
  country?: unknown;
  brand?: unknown;
  triedOn?: unknown;
  signal?: unknown;
  observed?: unknown;
  details?: unknown;
  /** 봇만 채우는 칸. 사람 눈에는 보이지 않는다. */
  website?: unknown;
  /** 폼이 뜬 뒤 흐른 시간(ms) */
  elapsed?: unknown;
}

export async function POST(req: Request): Promise<NextResponse> {
  if (!REPO || !TOKEN) {
    return bad(
      {
        en: 'The report desk is not connected yet. Please email it instead.',
        ko: '제보 창구가 아직 연결되지 않았습니다. 이메일로 보내주세요.',
      },
      503,
    );
  }

  let body: Payload;
  try {
    body = (await req.json()) as Payload;
  } catch {
    return bad({ en: 'Could not read the form.', ko: '폼을 읽지 못했습니다.' });
  }

  // 봇 거르기 — 조용히 성공한 척하지 않는다. 사람이 잘못 걸렸을 때 알 수 있어야 한다.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return bad({ en: 'Rejected.', ko: '거부되었습니다.' });
  }
  if (typeof body.elapsed !== 'number' || body.elapsed < MIN_FILL_MS) {
    return bad({
      en: 'That was too fast. Please try again.',
      ko: '너무 빨리 제출됐습니다. 다시 시도해 주세요.',
    });
  }

  const kind = body.kind as Kind;
  if (kind !== 'foreign-card' && kind !== 'foreign-sms' && kind !== 'correction') {
    return bad({ en: 'Unknown report type.', ko: '알 수 없는 제보 종류입니다.' });
  }

  const service = typeof body.service === 'string' ? body.service.trim() : '';
  if (!ID.test(service)) {
    return bad({ en: 'Please pick a service.', ko: '서비스를 선택해 주세요.' });
  }

  const details = typeof body.details === 'string' ? body.details.trim().slice(0, MAX_DETAILS) : '';
  const observed = typeof body.observed === 'string' ? body.observed.trim().slice(0, MAX_DETAILS) : '';

  // 자유 서술만 검사하면 된다. 나머지 칸은 형식이 고정돼 있어 개인정보가 들어갈 자리가 없다.
  const screened = screenForPersonalData(`${details}\n${observed}`);
  if (!screened.clean) {
    const what = screened.hits.map((h) => HIT_LABELS[h] ?? { en: h, ko: h });
    return bad({
      en: `Your text looks like it contains ${what.map((w) => w.en).join(' and ')}. Nothing was saved. Please remove it and send again — we do not keep personal details.`,
      ko: `적어주신 내용에 ${what.map((w) => w.ko).join(', ')}가 들어 있는 것으로 보입니다. 아무것도 저장하지 않았습니다. 그 부분을 지우고 다시 보내주세요. 개인정보는 받지 않습니다.`,
    });
  }

  const lines: string[] = [];
  const add = (label: string, value: string): void => {
    if (value) lines.push(`### ${label}`, '', value, '');
  };

  add('Which service?', service);

  if (kind === 'foreign-card') {
    const outcome = CARD_OUTCOMES[String(body.outcome)];
    if (!outcome) return bad({ en: 'Please pick what happened.', ko: '결과를 선택해 주세요.' });
    add('What happened?', outcome);

    const country = typeof body.country === 'string' ? body.country.trim() : '';
    if (country && !COUNTRY.test(country)) {
      return bad({ en: 'That country name looks wrong.', ko: '국가 이름이 올바르지 않습니다.' });
    }
    add('Country that issued the card', country);

    const brand = typeof body.brand === 'string' ? body.brand.trim() : '';
    if (brand && !BRAND.test(brand)) {
      return bad({ en: 'That card brand looks wrong.', ko: '카드 브랜드가 올바르지 않습니다.' });
    }
    add('Card brand', brand);
  }

  if (kind === 'foreign-sms') {
    const outcome = SMS_OUTCOMES[String(body.outcome)];
    if (!outcome) return bad({ en: 'Please pick what happened.', ko: '결과를 선택해 주세요.' });
    add('What happened?', outcome);

    const country = typeof body.country === 'string' ? body.country.trim() : '';
    if (country && !COUNTRY.test(country)) {
      return bad({ en: 'That country name looks wrong.', ko: '국가 이름이 올바르지 않습니다.' });
    }
    add('Country of the phone number', country);
  }

  if (kind === 'correction') {
    const signal = typeof body.signal === 'string' ? body.signal.trim() : '';
    add('Which value is wrong?', signal);
    if (!observed) {
      return bad({
        en: 'Please say what you actually saw.',
        ko: '직접 보신 것을 적어 주세요.',
      });
    }
    add('What did you actually see?', observed);
  }

  const triedOn = typeof body.triedOn === 'string' ? body.triedOn.trim() : '';
  if (triedOn) {
    if (!DATE.test(triedOn)) {
      return bad({ en: 'That date looks wrong.', ko: '날짜 형식이 올바르지 않습니다.' });
    }
    add(kind === 'correction' ? 'When did you see it?' : 'When did you try?', triedOn);
  }

  add('Anything else?', details);

  lines.push(
    '---',
    '',
    '_Sent from the form on the website. No account, no email address, no personal details were collected._',
  );

  const title =
    kind === 'correction'
      ? `Correction: ${service}`
      : kind === 'foreign-card'
        ? `Foreign card: ${service}`
        : `Foreign SMS: ${service}`;

  const res = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
    method: 'POST',
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${TOKEN}`,
      'content-type': 'application/json',
      'x-github-api-version': '2022-11-28',
    },
    body: JSON.stringify({ title, body: lines.join('\n'), labels: LABELS[kind] }),
  });

  if (!res.ok) {
    // 토큰이나 권한 문제다. 제보자 잘못이 아니므로 그렇게 말한다.
    return bad(
      {
        en: 'Something broke on our side, not yours. Please email it instead and it will be recorded the same way.',
        ko: '저희 쪽 문제입니다. 이메일로 보내주시면 같은 방식으로 기록하겠습니다.',
      },
      502,
    );
  }

  const issue = (await res.json()) as { html_url?: string; number?: number };
  return NextResponse.json({ ok: true, url: issue.html_url ?? null, number: issue.number ?? null });
}
