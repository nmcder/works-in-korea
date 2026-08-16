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
 *
 * ── 라벨이 두 갈래인 이유
 *
 * 측정값에 대한 제보(직접 해봤다·틀렸다)에는 `report` 를 붙인다. 수집기가
 * `labels=report` 로만 가져가므로, 이것이 데이터 파이프라인에 들어가는 표시다.
 *
 * 사이트에 대한 의견과 "서비스를 추가해 달라"는 요청에는 **붙이지 않는다.**
 * 측정값이 아니라 우리에게 하는 말이라서 데이터로 들어갈 자리가 없고,
 * 억지로 넣으면 파서가 서비스 ID 를 못 찾아 needs-review 만 쌓인다.
 * 이슈로 남아 사람이 읽으면 그만이다.
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
const MAX_TEXT = 1200;

type Intent = 'experience' | 'correction' | 'new-service' | 'site-feedback';
type Topic =
  | 'overseas-access'
  | 'languages'
  | 'signup'
  | 'foreign-card'
  | 'foreign-sms'
  | 'support-en';

const INTENTS: Intent[] = ['experience', 'correction', 'new-service', 'site-feedback'];

/**
 * 라벨. `report` 가 붙은 것만 수집기가 가져간다 (파일 첫머리 주석 참고).
 *
 * `report:foreign_card` 와 `report:foreign_phone_sms` 만 자동 반영된다.
 * 나머지 `report:*` 는 엔진이 needs-review 로 남기고 사람이 처리한다.
 */
const TOPIC_LABEL: Record<Topic, string> = {
  'overseas-access': 'report:observation',
  languages: 'report:observation',
  signup: 'report:observation',
  'foreign-card': 'report:foreign_card',
  'foreign-sms': 'report:foreign_phone_sms',
  'support-en': 'report:observation',
};

/**
 * 결과 문구.
 *
 * ⚠️ foreign-card·foreign-sms 의 문장은 마음대로 정할 수 없다. 엔진의 `readOutcome()`
 * 이 이 문자열을 보고 works/fails/mixed 를 가른다. 여기를 고치면 저기도 같이 고쳐야 한다.
 * 나머지 항목은 사람이 읽고 처리하므로 문구가 자유롭다 — 다만 readOutcome 이 잘못
 * 집어가지 않도록 'it worked' · 'rejected' · 'only sometimes' 같은 조각은 피한다.
 */
const OUTCOMES: Record<Topic, Record<string, string>> = {
  'overseas-access': {
    works: 'The site opened normally from outside Korea',
    fails: 'The site never loaded from outside Korea',
    blocked: 'It said the visitor’s country is not allowed',
    mixed: 'It opened but parts of it did not work',
  },
  languages: {
    en: 'English was available',
    'ko-only': 'Korean only',
    partial: 'English on some pages, Korean on others',
    other: 'Another language was available',
  },
  signup: {
    ok: 'Signed up without a Korean phone number',
    'needs-phone': 'Korean phone verification was demanded',
    alt: 'A passport or residence card was accepted instead',
    'blocked-other': 'Blocked at sign-up for some other reason',
  },
  'foreign-card': {
    works: 'It worked — the payment went through',
    fails: 'It failed — the card was rejected',
    mixed: 'Partly — it worked only sometimes',
  },
  'foreign-sms': {
    works: 'The text arrived',
    fails: 'No text arrived',
    rejected: 'The form would not even accept the number',
    mixed: 'Partly — it arrived only sometimes',
  },
  'support-en': {
    yes: 'They answered in English',
    no: 'Support is in Korean only',
    none: 'Asked in English, received no reply',
  },
};

/** 각 항목을 사람이 읽는 제목으로 */
const TOPIC_TITLE: Record<Topic, string> = {
  'overseas-access': 'Access from abroad',
  languages: 'Interface languages',
  signup: 'Sign-up',
  'foreign-card': 'Foreign card',
  'foreign-sms': 'Foreign SMS',
  'support-en': 'English support',
};

const ID = /^[a-z0-9][a-z0-9-]{1,48}$/;
const COUNTRY = /^[A-Za-zÀ-ɏ .'-]{2,56}$/;
const BRAND = /^[A-Za-z0-9 .'-]{2,32}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const NAME = /^[^\n\r<>]{2,80}$/;

function bad(message: { en: string; ko: string }, status = 400): NextResponse {
  return NextResponse.json({ ok: false, message }, { status });
}

function str(v: unknown, max = MAX_TEXT): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

interface Payload {
  intent?: unknown;
  topic?: unknown;
  service?: unknown;
  outcome?: unknown;
  country?: unknown;
  brand?: unknown;
  triedOn?: unknown;
  signal?: unknown;
  observed?: unknown;
  details?: unknown;
  serviceName?: unknown;
  serviceUrl?: unknown;
  page?: unknown;
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

  const intent = body.intent as Intent;
  if (!INTENTS.includes(intent)) {
    return bad({ en: 'Unknown report type.', ko: '알 수 없는 제보 종류입니다.' });
  }

  const details = str(body.details);
  const observed = str(body.observed);

  // 자유 서술만 검사하면 된다. 나머지 칸은 형식이 고정돼 있어 개인정보가 들어갈 자리가 없다.
  const screened = screenForPersonalData(
    [details, observed, str(body.serviceName, 80), str(body.page, 200)].join('\n'),
  );
  if (!screened.clean) {
    const what = screened.hits.map((h) => HIT_LABELS[h] ?? { en: h, ko: h });
    return bad({
      en: `Your text looks like it contains ${what.map((w) => w.en).join(' and ')}. Nothing was saved. Please remove it and send again — we do not keep personal details.`,
      ko: `적어주신 내용에 ${what.map((w) => w.ko).join(', ')}가 들어 있는 것으로 보입니다. 아무것도 저장하지 않았습니다. 그 부분을 지우고 다시 보내주세요. 개인정보는 받지 않습니다.`,
    });
  }

  /*
   * 안내 문구는 첫 `###` **앞에** 둔다.
   *
   * parseIssueForm 은 `###` 로 자른 뒤 첫 조각(서문)을 버린다. 뒤에 붙이면 마지막
   * 항목의 값에 딸려 들어가서, 우리가 쓴 문장이 제보자가 쓴 말로 저장된다.
   * 2026-08-15 시험 제보의 details 가 실제로 "no + 안내문" 이 됐다.
   */
  const lines: string[] = [
    '_Sent from the form on the website. No account, no email address, no personal details were collected._',
    '',
  ];
  const add = (label: string, value: string): void => {
    if (value) lines.push(`### ${label}`, '', value, '');
  };

  let title: string;
  /** 없으면 수집기가 못 본다. 이게 실패하면 제보가 파이프라인에 안 들어간다. */
  let required: string[];
  /** 있으면 분류가 편하지만 없어도 동작에는 지장이 없다. */
  let optional: string[];

  if (intent === 'experience') {
    const topic = body.topic as Topic;
    if (!(topic in OUTCOMES)) {
      return bad({ en: 'Please pick what you tried.', ko: '무엇을 해보셨는지 골라 주세요.' });
    }
    const service = str(body.service, 50);
    if (!ID.test(service)) {
      return bad({ en: 'Please pick a service.', ko: '서비스를 선택해 주세요.' });
    }
    const outcome = OUTCOMES[topic][String(body.outcome)];
    if (!outcome) {
      return bad({ en: 'Please pick what happened.', ko: '결과를 선택해 주세요.' });
    }

    add('Which service?', service);
    add('What happened?', outcome);

    if (topic === 'foreign-card' || topic === 'foreign-sms') {
      const country = str(body.country, 56);
      if (country && !COUNTRY.test(country)) {
        return bad({ en: 'That country name looks wrong.', ko: '국가 이름이 올바르지 않습니다.' });
      }
      add(
        topic === 'foreign-card' ? 'Country that issued the card' : 'Country of the phone number',
        country,
      );
    }
    if (topic === 'foreign-card') {
      const brand = str(body.brand, 32);
      if (brand && !BRAND.test(brand)) {
        return bad({ en: 'That card brand looks wrong.', ko: '카드 브랜드가 올바르지 않습니다.' });
      }
      add('Card brand', brand);
    }

    const triedOn = str(body.triedOn, 10);
    if (triedOn) {
      if (!DATE.test(triedOn)) {
        return bad({ en: 'That date looks wrong.', ko: '날짜 형식이 올바르지 않습니다.' });
      }
      add('When did you try?', triedOn);
    }
    add('Anything else?', details);

    title = `${TOPIC_TITLE[topic]}: ${service}`;
    required = ['report'];
    optional = [TOPIC_LABEL[topic]];
  } else if (intent === 'correction') {
    const service = str(body.service, 50);
    if (!ID.test(service)) {
      return bad({ en: 'Please pick a service.', ko: '서비스를 선택해 주세요.' });
    }
    if (!observed) {
      return bad({ en: 'Please say what you actually saw.', ko: '직접 보신 것을 적어 주세요.' });
    }
    add('Which service?', service);
    add('Which value is wrong?', str(body.signal, 80));
    add('What did you actually see?', observed);
    add('Anything else?', details);

    title = `Correction: ${service}`;
    required = ['report'];
    optional = ['report:correction'];
  } else if (intent === 'new-service') {
    const name = str(body.serviceName, 80);
    const url = str(body.serviceUrl, 300);
    if (!NAME.test(name)) {
      return bad({ en: 'Please give the service a name.', ko: '서비스 이름을 적어 주세요.' });
    }
    let host: string;
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('scheme');
      host = parsed.host;
    } catch {
      return bad({
        en: 'That address does not look like a link. It should start with https://',
        ko: '주소가 올바르지 않습니다. https:// 로 시작해야 합니다.',
      });
    }
    add('Service name', name);
    add('Address', url);
    add('Anything else?', details);

    title = `New service: ${name} (${host})`;
    // 데이터가 아니라 사람에게 가는 요청이다 — 수집기가 가져가지 않도록 report 를 뺀다
    required = [];
    optional = ['suggestion', 'suggestion:new-service'];
  } else {
    if (!observed) {
      return bad({
        en: 'Please tell us what happened.',
        ko: '어떤 일이 있었는지 적어 주세요.',
      });
    }
    add('Which page?', str(body.page, 200));
    add('What happened, or what would help?', observed);

    title = 'Site feedback';
    required = [];
    optional = ['suggestion', 'suggestion:site'];
  }

  /*
   * 라벨 하나 때문에 제보를 통째로 잃지 않는다.
   *
   * 저장소에 없는 라벨을 넘겼을 때 GitHub 이 새로 만들어 주는지 거절하는지는
   * 계정 권한에 따라 다르다. 거절이면 이슈 생성 자체가 실패하고, 사람이 힘들게 적은
   * 제보가 사라진다. 실제로 이 저장소에는 `report:foreign_phone_sms` 도
   * `report:correction` 도 아직 없다 — 여태 카드 제보만 들어와서 안 드러났을 뿐이다.
   *
   * 그래서 두 번 시도한다. 처음에는 다 붙여서, 실패하면 **꼭 필요한 것만** 붙여서.
   * 수집기가 보는 `report` 만 살아 있으면 파이프라인은 정상으로 돈다.
   */
  const create = (labels: string[]): Promise<Response> =>
    fetch(`https://api.github.com/repos/${REPO}/issues`, {
      method: 'POST',
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${TOKEN}`,
        'content-type': 'application/json',
        'x-github-api-version': '2022-11-28',
      },
      body: JSON.stringify({ title, body: lines.join('\n'), labels }),
    });

  let res = await create([...required, ...optional]);
  if (!res.ok && optional.length > 0) res = await create(required);

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
