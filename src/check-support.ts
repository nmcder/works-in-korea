/**
 * 고객센터 주소 확인 — 시드에 쓰기 전에 실제로 열어 본다.
 *
 * 사람이 직접 찾아 준 주소라도 그대로 믿지 않는다. 확인할 것이 넷 있다.
 *   1. robots.txt 가 막지 않는가        막으면 프로브도 못 읽는다. 넣어도 소용없다
 *   2. 열리는가                          점검 중이거나 로그인 벽이면 못 읽는다
 *   3. 읽을 글자가 있는가                자바스크립트로 그리는 화면은 본문이 비어 있다
 *   4. 상담 창구 얘기가 있는가            전화·이메일·채팅·운영시간
 *
 * 넷을 통과해야 support_en 프로브가 판정할 수 있다. 하나라도 빠지면 주소를 넣어도
 * 결과는 unknown 이고, 그러면 넣은 사람만 헛수고한 것이 된다.
 *
 *   npm run check-support -- <id>=<주소> [...]
 *   npm run check-support -- --file=목록.txt        (한 줄에 `id 주소` 또는 `id: 주소`)
 *   npm run check-support -- --apply ...            확인된 것만 시드에 기록
 */
import { readFile, writeFile } from 'node:fs/promises';
import { PATHS } from './config.js';
import { closeBrowser, snapshotPage } from './lib/browser.js';
import { politeFetch, visibleText } from './lib/http.js';
import { log } from './lib/log.js';
import type { SeedService } from './types.js';

/** 상담 창구가 적혀 있다는 신호 */
const CHANNEL_MARKERS = [
  '고객센터',
  '고객지원',
  '문의',
  '상담',
  '자주 묻는',
  '운영시간',
  '이용시간',
  'faq',
  'help',
  'support',
  'contact',
  'inquiry',
  'customer',
];

/** 프로브(support-en.ts)와 같은 값이어야 한다. 어긋나면 여기서 통과한 주소가 측정 때 막힌다 */
const RENDER_THRESHOLD = 400;

/** 전화번호·이메일이 보이면 창구가 실재한다는 강한 신호 */
const PHONE = /\b(?:1[5-9]\d{2}-\d{4}|0\d{1,2}-\d{3,4}-\d{4}|\+82[\d -]{7,})\b/;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.]{2,}/;

interface Checked {
  id: string;
  url: string;
  ok: boolean;
  why: string;
}

async function check(id: string, url: string): Promise<Checked> {
  const res = await politeFetch(url, {
    headers: { 'accept-language': 'en-US,en;q=0.9' },
    timeoutMs: 20000,
  });

  if (res.blockedReason !== null) {
    return { id, url, ok: false, why: `robots.txt 가 막는다 — 프로브도 못 읽는다 (${res.blockedReason})` };
  }
  if (res.error !== null) return { id, url, ok: false, why: `열지 못함 — ${res.error}` };
  if (res.status === null || res.status >= 400) {
    return { id, url, ok: false, why: `status=${res.status ?? '응답 없음'}` };
  }

  let text = res.body ? visibleText(res.body, 20000) : '';
  let rendered = false;

  // 프로브(support-en.ts)와 같은 조건으로 본다. 여기서 통과한 주소만 실제로 판정되고,
  // 여기서 막히는 주소는 넣어 봐야 unknown 이 된다. 두 곳의 기준이 어긋나면
  // "확인됐다"고 넣은 주소가 정작 측정 때 못 읽히는 일이 생긴다.
  if (text.length < RENDER_THRESHOLD) {
    const page = await snapshotPage(url);
    if (page.ok && (page.visibleText ?? '').length > text.length) {
      text = (page.visibleText ?? '').slice(0, 20000);
      rendered = true;
    }
  }

  if (text.length < RENDER_THRESHOLD) {
    return {
      id,
      url,
      ok: false,
      why: `브라우저로 그려도 글자가 ${text.length}자뿐 — 프로브도 못 읽는다`,
    };
  }

  const lower = text.toLowerCase();
  const markers = CHANNEL_MARKERS.filter((m) => lower.includes(m));
  const hasPhone = PHONE.test(text);
  const hasEmail = EMAIL.test(text);

  if (markers.length === 0 && !hasPhone && !hasEmail) {
    return { id, url, ok: false, why: `${text.length}자를 읽었지만 상담 창구 얘기가 없다` };
  }

  const found = [
    `${text.length}자`,
    hasPhone ? '전화번호' : null,
    hasEmail ? '이메일' : null,
    markers.length > 0 ? markers.slice(0, 3).join('·') : null,
    rendered ? '브라우저 렌더링 필요' : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return { id, url, ok: true, why: found };
}

function parsePairs(tokens: string[]): { id: string; url: string }[] {
  const out: { id: string; url: string }[] = [];
  for (const raw of tokens) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    // `id=주소` / `id 주소` / `id: 주소` 를 모두 받는다
    const m = /^([a-z0-9-]+)\s*[=:\s]\s*(https?:\/\/\S+)/i.exec(line);
    if (m) out.push({ id: m[1]!, url: m[2]! });
  }
  return out;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const fileArg = argv.find((a) => a.startsWith('--file='))?.slice('--file='.length);

  const tokens = fileArg
    ? (await readFile(fileArg, 'utf8')).split('\n')
    : argv.filter((a) => !a.startsWith('--'));
  const pairs = parsePairs(tokens);

  if (pairs.length === 0) {
    console.log('사용법: npm run check-support -- <id>=<주소> [...]  또는  --file=목록.txt');
    process.exitCode = 1;
    return;
  }

  log.info(`${pairs.length}개 주소 확인${apply ? ' · --apply' : ''}`);

  const results: Checked[] = [];
  for (const p of pairs) {
    const r = await check(p.id, p.url);
    results.push(r);
    log.info(`  ${r.ok ? 'OK  ' : '실패'} ${r.id.padEnd(18)} ${r.why}`);
  }

  // 브라우저를 띄웠으면 닫아야 프로세스가 끝난다
  await closeBrowser();

  const good = results.filter((r) => r.ok);
  const bad = results.filter((r) => !r.ok);
  log.info(`\n확인 ${good.length}건 · 실패 ${bad.length}건`);

  if (!apply) {
    if (good.length > 0) log.info('--apply 를 붙이면 확인된 것만 시드에 쓴다.');
    return;
  }

  const raw = JSON.parse(await readFile(PATHS.seeds, 'utf8')) as {
    services: SeedService[];
    updated_at?: string;
  };
  let wrote = 0;
  for (const r of good) {
    const seed = raw.services.find((s) => s.id === r.id);
    if (!seed) {
      log.warn(`  '${r.id}' 라는 서비스가 시드에 없다`);
      continue;
    }
    seed.hints = { ...(seed.hints ?? {}), support_url: r.url };
    wrote += 1;
  }
  raw.updated_at = new Date().toISOString().slice(0, 10);
  await writeFile(PATHS.seeds, `${JSON.stringify(raw, null, 2)}\n`, 'utf8');
  log.info(`시드에 ${wrote}건 기록. npm run seed 로 반영할 것.`);
}

main().catch((e: unknown) => {
  log.error(String(e));
  process.exitCode = 1;
});
