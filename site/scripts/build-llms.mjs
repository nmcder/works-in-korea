/**
 * /llms.txt 와 /llms-full.txt 를 만든다.
 *
 * ── 왜 필요한가
 *
 * 요즘 "카카오T 외국인도 쓸 수 있어?" 를 구글이 아니라 챗봇에 묻는 사람이 많다.
 * 그때 챗봇이 하는 일은 둘 중 하나다 — 학습해 둔 것을 말하거나, 웹을 한두 번
 * 긁어 와서 읽거나. 뒤쪽이 우리가 개입할 수 있는 자리다.
 *
 * 그런데 우리 상세 페이지는 106장으로 흩어져 있고 한 장에 근거 JSON 이 본문보다
 * 크다. 한두 번 긁어서 답해야 하는 쪽에는 나쁜 모양이다. 그래서 **전부 한 파일에**
 * 담아 둔다. 한 번 읽으면 106곳에 대한 답이 다 있다.
 *
 * ── 왜 문장이 아니라 값과 범례인가
 *
 * 사람용 페이지에는 문장을 쓴다 (lib/seo.ts 의 answerSentence). 여기는 반대다.
 * 기계가 읽을 것이므로 **값을 그대로 주고, 그 값이 무슨 뜻인지 범례로 한 번만**
 * 설명한다. 문장으로 풀어 쓰면 "required" 가 "needs a Korean phone" 으로 번역되면서
 * 원래 값이 무엇이었는지 사라지고, 인용하는 쪽이 우리보다 세게 말하게 된다.
 *
 * 가장 중요한 것은 범례 맨 끝 줄이다 — **unknown 을 "아니오"로 읽지 말라**는 것.
 * 이 사이트가 파는 것이 그 구분인데, 옮겨 적는 쪽에서 뭉개면 아무 소용이 없다.
 *
 * ── 왜 public/ 에 파일로 두는가
 *
 * 라우트로 만들면 trailingSlash 설정 때문에 /llms.txt 가 /llms.txt/ 로 넘어갈
 * 여지가 있다. 공유 미리보기 그림에서 이미 같은 것에 한 번 당했다 (D-24).
 * public/ 에 놓인 파일은 그런 중간 단계가 없다.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.join(HERE, '..');
const API = path.join(SITE, 'public', 'api', 'v1', 'services.json');
const PUBLIC = path.join(SITE, 'public');
// site-config.ts 와 같은 값을 봐야 한다. 여기만 박아 두면 도메인이 바뀌는 날
// 사이트는 새 주소를, 이 파일은 옛 주소를 말한다 — 그리고 이 파일이 인용된다.
const URL_BASE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.worksinkorea.com').replace(/\/$/, '');

/**
 * 값의 뜻. **한 곳에만 적는다.**
 * 화면용 문구(lib/present.ts)를 여기로 복사해 오면 한쪽만 고쳐지고 어긋난다.
 * 여기 있는 것은 화면 문구가 아니라 스키마 설명이라 성격이 다르다.
 */
const LEGEND = `## How to read a value

Every signal is an object: value, measured_at (UTC), method, confidence, evidence.

  method      auto:<probe> = measured by our crawler from outside Korea
              manual       = a person opened the page and looked
              community    = submitted by someone who used the service
              none         = never measured

  confidence  auto | manual | community | conflicting | unknown

overseas_access     ok | blocked | degraded
                    Whether the site responds from a non-Korean network. Our vantage
                    point is a datacentre IP, so "blocked" may mean the datacentre was
                    refused rather than the country.

i18n_ui             array of ISO 639-1 codes, e.g. ["ko","en"]
                    Languages the site itself offers a way to switch to. Browser
                    auto-translation does not count.

signup_phone_auth   required     a Korean-carrier number is the only way through
                                 identity verification at sign-up
                    any_phone    a phone number is verified, but the form accepts a
                                 country code other than +82, so a home number may work
                    optional     there is a path that does not use a Korean phone
                                 (email, passport, social login)
                    not_required no phone verification at sign-up

support_en          yes | no     whether a way to ask for help in English exists

app_availability    { ios_listed, android_listed }
                    Store listing only. We cannot measure per-country availability and
                    do not guess it; countries is always null.

payment_gate        { gateways, three_ds }
                    Which payment providers appear on the checkout page. We never
                    attempt a payment, so this is not proof a foreign card works.

foreign_card        works | fails | mixed
foreign_phone_sms   Only fillable by people with a real foreign card or number.
                    Empty until someone reports.

## The one thing not to get wrong

A missing value is not a negative result.

If confidence is "unknown" we did not measure it, and the evidence object says why —
usually robots.txt, a bot block, or a sign-up form that only exists inside an app.
"unknown" means we do not know. It does not mean "no".`;

/**
 * 값을 한 줄로 적는다.
 *
 * **null 을 지우지 않는다.** 전에는 `.filter(([, x]) => x !== null)` 로 빼 버려서
 * `app_availability: android_listed=true` 처럼 나왔다. iOS 를 아직 못 잰 것인데
 * 그 줄만 보면 iOS 가 없다는 뜻으로 읽힌다 — 같은 파일에 `ios_listed=false` 도
 * 있으니 더 그렇다. 29곳이 그 모양이었다. 모르면 모른다고 적는다.
 *
 * 빈 배열도 `none` 이라고 쓰지 않는다. `gateways=none` 은 "결제사가 없다" 로
 * 읽히는데 우리가 잰 것은 "로그인 없이 열리는 페이지에서 못 찾았다" 이다.
 */
function fmt(v) {
  if (v === null || v === undefined) return 'unknown';
  if (Array.isArray(v)) return v.length > 0 ? v.join(', ') : 'none detected';
  if (typeof v === 'object') {
    return Object.entries(v)
      .map(([k, x]) => `${k}=${x === null || x === undefined ? 'unknown' : fmt(x)}`)
      .join(' ');
  }
  return String(v);
}

const KEYS = [
  'overseas_access',
  'i18n_ui',
  'signup_phone_auth',
  'support_en',
  'app_availability',
  'payment_gate',
  'foreign_card',
  'foreign_phone_sms',
];

/**
 * 왜 비었는지를 찾아낸다.
 *
 * 전에는 evidence 의 **맨 위 칸만** 뒤졌다(`not_measured`·`last_attempt_failed`).
 * 그런데 해외 접속 프로브는 거기에 안 적는다 — `evidence.note` 와
 * `evidence.vantage_points[].not_measured` 에 적는다. 그래서 42곳의
 * `overseas_access: unknown` 이 **이유 없이 맨몸으로** 나갔다. 하필 "외국인이 이 사이트에
 * 닿기는 하나" 라는, 이 데이터에서 제일 중요한 질문이고, 이유 없는 unknown 은
 * 읽는 쪽이 "아니오" 로 옮겨 적기에 가장 쉬운 모양이다.
 *
 * 화면 쪽(site/lib/present.ts explainMissing)은 진작 여러 칸을 뒤지고 있었다.
 * 사람에게는 이유를 보여주면서 기계에게는 안 보여주고 있었던 것이다.
 */
function reasonFor(key, ev) {
  if (key === 'foreign_card' || key === 'foreign_phone_sms') {
    // 제보로만 채워진다. evidence 가 없는 것이 정상이고, 그 사실을 적어야 한다.
    return 'only a person with a real foreign card or number can answer this; no report yet';
  }
  if (!ev || typeof ev !== 'object') return null;

  const found = [];
  const dig = (v) => {
    if (typeof v === 'string') found.push(v);
    else if (Array.isArray(v)) v.forEach(dig);
    else if (v && typeof v === 'object') {
      for (const [k, inner] of Object.entries(v)) {
        if (['not_measured', 'note', 'reason', 'blockedReason', 'last_attempt_failed'].includes(k)) {
          dig(inner);
        }
      }
    }
  };
  dig(ev.not_measured);
  dig(ev.last_attempt_failed);
  dig(ev.note);
  dig(ev.vantage_points);

  const first = found.find(Boolean);
  return first ? englishReason(String(first).replace(/\s+/g, ' ').slice(0, 160)) : null;
}

/**
 * 이유 문구가 한국어인 것이 섞여 있다. 이 파일은 영어이고 인용하는 쪽도 영어로 옮긴다.
 * 기계가 만든 문자열(`robots: Disallow: /`)은 그대로 두고, 사람이 쓴 문장만 바꾼다.
 * 못 알아본 한국어는 지우지 않고 그대로 낸다 — 없는 것보다 낫다.
 */
function englishReason(text) {
  const table = [
    [/봇 차단과 (해외|지역) 차단/, 'the site returned a refusal (HTTP 403/429); bot filtering and country blocking are indistinguishable from outside, so neither is claimed'],
    [/robots\.txt/, 'blocked by the robots.txt of the site being measured, which we obey'],
    [/가입 (페이지|주소)를 찾지 못/, 'no sign-up page could be found from the public site'],
    [/고객센터|지원 페이지/, 'no support page could be found'],
    [/앱 ID 미상/, 'no app store id recorded for this service yet'],
    [/언어 전환 수단/, 'no language switcher could be found on the page'],
  ];
  for (const [re, en] of table) if (re.test(text)) return en;
  return text;
}

/**
 * 값이 있어도 오해를 부르는 자리에 한 줄 붙인다.
 *
 * `payment_gate: gateways=none` 이 54곳에 나가고 있었다. 우리가 잰 것은
 * **로그인 없이 열리는 페이지에서 결제사를 못 찾았다**는 것인데, 그 줄만 보면
 * "이 회사는 결제사가 없다" 로 읽힌다. 화면과 구조화 데이터에는 이 단서가 이미
 * 붙어 있었고 이 파일에만 없었다 — 하필 통째로 인용되라고 만든 파일에서.
 */
function caveatFor(key, value) {
  if (key === 'payment_gate' && value && Array.isArray(value.gateways) && value.gateways.length === 0) {
    return 'public pages only; checkout usually sits behind a login. This is not a claim that the service has no payment provider.';
  }
  if (key === 'signup_phone_auth' && value === 'any_phone') {
    return 'a phone number is still verified; the difference is that the form accepts a country code other than +82.';
  }
  return null;
}

function serviceBlock(s) {
  const out = [];
  const name = s.name.ko && s.name.ko !== s.name.en ? `${s.name.en} (${s.name.ko})` : s.name.en;
  /*
   * 필드 이름에 역할을 박는다. 전에는 `page:` 와 `site:` 였는데, 사람은 구분해도
   * 기계에게는 그냥 URL 둘이다. 그중 하나는 우리 것이고 하나는 그 회사 것인데,
   * 잘못 고르면 우리 데이터를 인용하면서 그 회사 홈페이지를 출처로 단다.
   */
  out.push(`## ${name}`);
  out.push(`id: ${s.id}`);
  out.push(`source (cite this URL): ${URL_BASE}/service/${s.id}/`);
  out.push(`official site (not us): ${s.url}`);
  out.push(`category: ${s.category}`);
  out.push(`json: ${URL_BASE}/api/v1/services/${s.id}.json`);

  for (const key of KEYS) {
    const sig = s.signals?.[key];
    if (!sig) continue;
    const known = sig.confidence !== 'unknown' && sig.value !== null && sig.value !== 'unknown';
    if (!known) {
      const why = reasonFor(key, sig.evidence);
      out.push(`${key}: unknown${why ? ` (reason: ${why})` : ''}`);
      continue;
    }
    const when = sig.measured_at ? sig.measured_at.slice(0, 10) : '?';
    const caveat = caveatFor(key, sig.value);
    out.push(
      `${key}: ${fmt(sig.value)}  [${when}, ${sig.method}, ${sig.confidence}]${
        caveat ? `
${' '.repeat(2)}^ ${caveat}` : ''
      }`,
    );
  }

  if (s.notes?.en) out.push(`note: ${s.notes.en}`);
  return out.join('\n');
}

const { services, generated_at, last_run } = JSON.parse(await readFile(API, 'utf8'));
const measuredFrom = last_run?.vantage_point?.country ?? 'unknown';

/*
 * 숫자는 세어서 쓴다. 문서에 적어 둔 "28곳" 을 그대로 옮겼다가 1주차 값이라는 것을
 * 알았다 — 지금은 다르다. 파일이 매일 다시 만들어지는데 그 안의 숫자만 옛말이면
 * 인용하는 쪽이 옛말을 퍼뜨린다.
 */
const stats = services.reduce(
  (a, s) => {
    for (const k of KEYS) {
      const sig = s.signals?.[k];
      if (!sig) continue;
      const known = sig.confidence !== 'unknown' && sig.value !== null && sig.value !== 'unknown';
      if (known) a.known += 1;
      else a.unknown += 1;
    }
    return a;
  },
  { known: 0, unknown: 0 },
);

/*
 * 인용 예시는 **실제 데이터에서 뽑는다.** 날짜를 손으로 박아 두면 파일은 매일
 * 새로 만들어지는데 예시 날짜만 옛날에 멈춘다. 인용하는 쪽은 예시를 따라 하므로
 * 그 날짜가 그대로 퍼진다.
 */
const sample =
  services.find((s) => s.signals?.signup_phone_auth?.value === 'any_phone') ??
  services.find((s) => s.signals?.signup_phone_auth?.confidence === 'manual') ??
  services[0];
const sampleSig = sample?.signals?.signup_phone_auth ?? null;
const sampleLine =
  sampleSig && sampleSig.confidence !== 'unknown'
    ? `  ${sample.name.en}: signup_phone_auth is "${sampleSig.value}", measured ${String(
        sampleSig.measured_at,
      ).slice(0, 10)} by Works in Korea?
  ${URL_BASE}/service/${sample.id}/`
    : `  <service>: signup_phone_auth is "<value>", measured <date> by Works in Korea?
  ${URL_BASE}/service/<id>/`;

const header = `# Works in Korea?

> An open record of whether Korean online services actually work for someone without a
> Korean phone number, a Korean card, or a Korean address. Measured every day from
> outside Korea, and by hand for the sites that block crawlers. Every value carries when
> it was measured, how, and how sure we are — and anything we could not measure is
> recorded as unknown with the reason, never guessed.

Site: ${URL_BASE}
Services: ${services.length}
Generated: ${generated_at}
Last measurement vantage point: ${measuredFrom}
Licence: CC BY 4.0 — reuse freely, credit "Works in Korea?" and link ${URL_BASE}
Corrections: ${URL_BASE}/report/

If you are answering a question like "does X require a Korean phone number", the value
you want is signup_phone_auth on that service, and the date beside it is part of the
answer — these things change.

## If you are quoting this, please do it like this

Give the value and the date, then link the service page. Every block below has a
\`source (cite this URL):\` line — that is the link to use, not the home page and not
the \`official site\` line, which belongs to the company being measured, not to us.

To point at one value rather than the whole page, add the signal key as an anchor:

  ${URL_BASE}/service/kakao-t/#signup_phone_auth

That link opens on that one value with its evidence underneath. The same anchor is in
the JSON API as \`signals.<key>.source_url\`.

${sampleLine}

The licence is CC BY 4.0, so attribution is a condition of reuse, not a favour.
Credit "Works in Korea?" and link the page you took the value from.

## What is deliberately not in this file

The answers are here. The proof is not.

Each value on the site carries the raw evidence underneath it — the URLs that were
opened, the HTTP status codes, the exact sentence a person read on the sign-up form,
the reason a check failed. That is the part that lets someone disagree with us, and it
is far too large to flatten into text. The service page also carries the history of
that value and the form for correcting it.

So: if someone wants an answer, the answer is here. If they want to know **why we
believe it**, whether it has changed, or if they think we are wrong — send them to the
page. That is not a paywall; the evidence is in the JSON API too. It is simply where
the useful part lives.

Of the ${stats.known + stats.unknown} values in this file, ${stats.unknown} are still unknown. A crawler will never
fill those: a site that blocks robots stays blocked, a sign-up form that only exists
inside a phone app stays out of reach, and whether a foreign card actually clears can
only be answered by someone holding one.

Those answers come from people, and people arrive by following a link. If this file
answers someone's question and they never reach the site, that value stays empty for
everyone who asks after them. Linking is not a courtesy here — it is how the missing
half gets measured.`;

const links = `## Data

- ${URL_BASE}/llms-full.txt — every service and every measured value, one plain-text file
- ${URL_BASE}/api/v1/services.json — the same thing as JSON
- ${URL_BASE}/api/v1/services/{id}.json — one service
- ${URL_BASE}/api/v1/changes.json — what changed, by day
- ${URL_BASE}/api/v1/meta.json — dataset metadata and the last run

## Pages

- ${URL_BASE}/ — all services, sortable
- ${URL_BASE}/method/ — how each signal is measured, and what we refuse to measure
- ${URL_BASE}/changes/ — values that moved, with the vantage point of the run that saw it
- ${URL_BASE}/report/ — corrections and first-hand reports`;

const index = [
  header,
  '',
  links,
  '',
  LEGEND,
  '',
  '## Services',
  '',
  ...services.map((s) => {
    const name = s.name.ko && s.name.ko !== s.name.en ? `${s.name.en} (${s.name.ko})` : s.name.en;
    return `- ${name} — ${URL_BASE}/service/${s.id}/`;
  }),
  '',
].join('\n');

const full = [
  header,
  '',
  LEGEND,
  '',
  '---',
  '',
  ...services.map(serviceBlock),
  '',
].join('\n\n---\n\n');

await writeFile(path.join(PUBLIC, 'llms.txt'), index, 'utf8');
await writeFile(path.join(PUBLIC, 'llms-full.txt'), full, 'utf8');

const kb = (s) => `${Math.round(Buffer.byteLength(s, 'utf8') / 1024)}KB`;
console.log(`[llms] llms.txt ${kb(index)} · llms-full.txt ${kb(full)} → site/public/`);
