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
const URL_BASE = 'https://www.worksinkorea.com';

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

function fmt(v) {
  if (v === null || v === undefined) return 'unknown';
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'object') {
    return Object.entries(v)
      .filter(([, x]) => x !== null)
      .map(([k, x]) => `${k}=${Array.isArray(x) ? x.join('/') || 'none' : x}`)
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

function serviceBlock(s) {
  const out = [];
  const name = s.name.ko && s.name.ko !== s.name.en ? `${s.name.en} (${s.name.ko})` : s.name.en;
  out.push(`## ${name}`);
  out.push(`id: ${s.id}`);
  out.push(`page: ${URL_BASE}/service/${s.id}/`);
  out.push(`site: ${s.url}`);
  out.push(`category: ${s.category}`);
  out.push(`json: ${URL_BASE}/api/v1/services/${s.id}.json`);

  for (const key of KEYS) {
    const sig = s.signals?.[key];
    if (!sig) continue;
    const known = sig.confidence !== 'unknown' && sig.value !== null && sig.value !== 'unknown';
    if (!known) {
      // 왜 비었는지가 값만큼 중요하다. 그게 없으면 게을러서 안 잰 것으로 읽힌다.
      const why =
        sig.evidence?.not_measured ??
        sig.evidence?.last_attempt_failed ??
        // 제보로만 채워지는 두 항목은 evidence 가 아예 없다. 비어 있는 것이 정상이고,
        // 그 이유를 적어 두지 않으면 "측정 실패"로 읽힌다. 측정한 적이 없는 것이다.
        (key === 'foreign_card' || key === 'foreign_phone_sms'
          ? 'only a person with a real foreign card or number can answer this; no report yet'
          : null);
      out.push(`${key}: unknown${why ? ` (reason: ${String(why).replace(/\s+/g, ' ').slice(0, 120)})` : ''}`);
      continue;
    }
    const when = sig.measured_at ? sig.measured_at.slice(0, 10) : '?';
    out.push(`${key}: ${fmt(sig.value)}  [${when}, ${sig.method}, ${sig.confidence}]`);
  }

  if (s.notes?.en) out.push(`note: ${s.notes.en}`);
  return out.join('\n');
}

const { services, generated_at, last_run } = JSON.parse(await readFile(API, 'utf8'));
const measuredFrom = last_run?.vantage_point?.country ?? 'unknown';

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
answer — these things change.`;

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
