/**
 * 앱 ID 등록 — 스토어 주소를 붙여넣으면 확인하고 시드에 써 준다.
 *
 * 자동 접근이 막힌 31곳은 앱 ID를 사람이 넣어야 한다 (애플 robots.txt 가 이름 검색을
 * 금지하므로 D-19). 그렇다고 운영자에게 JSON 을 직접 고치라고 하면 안 된다.
 *
 *   npm run add-app -- coupang "https://play.google.com/store/apps/details?id=com.coupang.mobile"
 *   npm run add-app -- coupang "https://apps.apple.com/kr/app/쿠팡/id454434967"
 *   npm run add-app -- coupang com.coupang.mobile 454434967      (주소 대신 ID만 줘도 된다)
 *
 * 주소는 여러 개를 한 번에 줘도 된다. 순서는 상관없다.
 *
 * ⚠️ 받은 값을 그대로 믿지 않는다. 스토어에 실제로 있는지 확인하고, 앱 이름을 찍어 준다.
 *    오타 난 패키지명을 그대로 넣으면 "앱이 있다"는 틀린 사실이 공개된다.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { PATHS } from './config.js';
import { politeFetch } from './lib/http.js';
import { log } from './lib/log.js';
import type { SeedService } from './types.js';

interface Found {
  ios?: string;
  android?: string;
}

/** 주소든 ID든 받아서 무엇인지 가려낸다 */
function parseToken(token: string, found: Found): string | null {
  const t = token.trim();

  const ios = /apps\.apple\.com\/[^\s]*?\/id(\d{6,12})/i.exec(t);
  if (ios) {
    found.ios = ios[1]!;
    return null;
  }
  const play = /play\.google\.com\/store\/apps\/details\?[^\s]*?id=([A-Za-z0-9_.]{4,80})/i.exec(t);
  if (play) {
    found.android = play[1]!;
    return null;
  }

  // 주소가 아니면 맨 ID 로 본다
  if (/^\d{6,12}$/.test(t)) {
    found.ios = t;
    return null;
  }
  if (/^[a-z][a-z0-9_]*(\.[a-z0-9_]+){1,}$/i.test(t)) {
    found.android = t;
    return null;
  }
  return `무엇인지 모르겠음: ${t}`;
}

async function checkIos(appId: string): Promise<{ ok: boolean; name: string; seller: string }> {
  // /lookup? 은 애플 robots.txt 에서 허용된다. /search 는 금지 — 쓰지 말 것.
  const res = await politeFetch(
    `https://itunes.apple.com/lookup?id=${encodeURIComponent(appId)}&country=kr`,
    { timeoutMs: 12000 },
  );
  if (res.blockedReason !== null || res.error !== null || !res.body) {
    return { ok: false, name: '', seller: res.blockedReason ?? res.error ?? '응답 없음' };
  }
  try {
    const data = JSON.parse(res.body) as {
      resultCount?: number;
      results?: { trackName?: string; sellerName?: string }[];
    };
    const hit = data.results?.[0];
    if (!data.resultCount || !hit) return { ok: false, name: '', seller: 'App Store 에 없음' };
    return { ok: true, name: hit.trackName ?? '?', seller: hit.sellerName ?? '?' };
  } catch {
    return { ok: false, name: '', seller: '응답을 읽지 못함' };
  }
}

async function checkAndroid(pkg: string): Promise<{ ok: boolean; note: string }> {
  const res = await politeFetch(
    `https://play.google.com/store/apps/details?id=${encodeURIComponent(pkg)}&hl=en`,
    { discardBody: true, timeoutMs: 12000 },
  );
  if (res.blockedReason !== null || res.error !== null || res.status === null) {
    return { ok: false, note: res.blockedReason ?? res.error ?? '응답 없음' };
  }
  if (res.status >= 200 && res.status < 300) return { ok: true, note: '' };
  if (res.status === 404) return { ok: false, note: 'Google Play 에 없음' };
  return { ok: false, note: `예상 밖 상태코드 ${res.status}` };
}

async function main(): Promise<void> {
  const flags = process.argv.slice(2).filter((a) => a.startsWith('--'));
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  // --check 는 스토어에 뭐가 있는지 보여만 주고 시드를 건드리지 않는다.
  // 맞는 앱인지 확신이 없을 때 먼저 확인하라고 있는 것이다.
  const checkOnly = flags.includes('--check');
  const [serviceId, ...tokens] = args;

  if (!serviceId || tokens.length === 0) {
    console.log(`사용법:
  npm run add-app -- <서비스id> <스토어 주소 또는 ID> [더 있으면 계속]

예시 (주소에 ? 와 & 가 있으므로 따옴표로 감싼다):
  npm run add-app -- coupang "https://play.google.com/store/apps/details?id=com.coupang.mobile"
  npm run add-app -- cgv "https://apps.apple.com/kr/app/cgv/id372383054" "co.kr.cgv.cjcgv"

서비스 id 는 사이트 주소에 쓰인 것과 같다. works-in-korea.vercel.app/service/coupang → coupang`);
    process.exitCode = 1;
    return;
  }

  const raw = JSON.parse(await readFile(PATHS.seeds, 'utf8')) as {
    services: SeedService[];
    updated_at?: string;
  };
  const seed = raw.services.find((s) => s.id === serviceId);
  if (!seed) {
    log.error(`'${serviceId}' 라는 서비스가 시드에 없다. 사이트 주소의 마지막 조각과 같아야 한다.`);
    process.exitCode = 1;
    return;
  }

  const found: Found = {};
  const problems = tokens.map((t) => parseToken(t, found)).filter((x): x is string => x !== null);
  for (const p of problems) log.warn(p);

  if (!found.ios && !found.android) {
    log.error('앱 스토어 주소도 Play 주소도 못 찾았다. 주소를 따옴표로 감쌌는지 확인할 것.');
    process.exitCode = 1;
    return;
  }

  const hints = { ...(seed.hints ?? {}) };
  let wrote = 0;

  if (found.ios) {
    const r = await checkIos(found.ios);
    if (r.ok) {
      hints.ios_app_id = found.ios;
      wrote += 1;
      log.info(`iOS  ${found.ios} → "${r.name}" (${r.seller}) 확인됨`);
    } else {
      log.error(`iOS  ${found.ios} → ${r.seller}. 쓰지 않는다.`);
    }
  }

  if (found.android) {
    const r = await checkAndroid(found.android);
    if (r.ok) {
      hints.android_package = found.android;
      wrote += 1;
      log.info(`Play ${found.android} → 확인됨`);
    } else {
      log.error(`Play ${found.android} → ${r.note}. 쓰지 않는다.`);
    }
  }

  if (checkOnly) {
    log.info('--check 이므로 시드를 건드리지 않았다.');
    return;
  }

  if (wrote === 0) {
    log.error('확인된 값이 없어 시드를 건드리지 않았다.');
    process.exitCode = 1;
    return;
  }

  seed.hints = hints;
  raw.updated_at = new Date().toISOString().slice(0, 10);
  await writeFile(PATHS.seeds, `${JSON.stringify(raw, null, 2)}\n`, 'utf8');

  log.info(`${seed.name.ko}: ${wrote}건 기록. 다 넣은 뒤 npm run seed 를 한 번 돌리면 된다.`);
}

main().catch((e: unknown) => {
  log.error(String(e));
  process.exitCode = 1;
});
