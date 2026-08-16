/**
 * 앱 아이콘 받아오기.  `npm run icons`
 *
 * 왜 필요한가: 목록이 글자만 106줄이면 훑을 수가 없다. 사람은 이름보다 그림을
 * 먼저 알아본다 — 쿠팡 아이콘을 아는 사람은 "Coupang" 을 읽기 전에 찾는다.
 *
 * ── 왜 직접 받아서 우리 서버에 두는가 (핫링크하지 않는가)
 *
 *   1. 우리 푸터에 "추적 없음" 이라고 적어 뒀다. 애플·구글 CDN 에서 이미지를 불러오면
 *      우리 사이트를 여는 모든 사람의 IP 가 그쪽으로 넘어간다. 그건 추적이 맞다.
 *   2. 남의 대역폭을 우리 트래픽만큼 쓰는 셈이 된다.
 *   3. 저쪽 주소가 바뀌면 우리 화면이 조용히 깨진다.
 *
 * ── 저작권에 대해
 *
 * 앱 아이콘은 각 회사의 상표이자 저작물이다. 우리는 그것을 **그 앱을 가리키기 위해서만**
 * 쓴다 — 이름 옆에, 원본 그대로, 작게. 앱스토어·언론·리뷰 사이트가 하는 것과 같은
 * 지시적 사용이고, 우리가 그 회사와 관련이 있다고 암시하지 않는다.
 * 그래도 권리자가 빼 달라고 하면 뺀다. 그 약속을 /method 페이지에 적어 뒀다.
 *
 * ── 어디서 받는가
 *
 *   iOS      itunes.apple.com/lookup  — 애플이 공개한 **문서화된 API** 다.
 *            robots.txt 의 `Disallow: /*​/lookup?` 는 `/kr/lookup?` 처럼 국가 코드가
 *            앞에 붙은 형태를 막는 규칙이고, 우리가 쓰는 최상위 `/lookup?` 은
 *            그 패턴에 걸리지 않는다. 애플이 문서에 적어 둔 분당 20회 제한을 지킨다.
 *   Android  play.google.com/store/apps/details — robots.txt 에서 허용된 경로다.
 *            og:image 하나만 읽고 나온다.
 *
 * 결과는 site/public/icon/<id>.jpg 로 커밋된다. 빌드 때 네트워크를 쓰지 않기 위해서다 —
 * 배포할 때마다 애플에 106번 요청하는 것은 무례하고, 저쪽이 느린 날 배포가 깨진다.
 */
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.join(HERE, '..');
const DATA = process.env.WIK_DATA_DIR?.trim() || path.join(SITE, '..', 'data');
const OUT = path.join(SITE, 'public', 'icon');

/** 엔진과 같은 신원을 쓴다 — 우리가 누구인지 저쪽 로그에 남아야 한다 (절대규칙 4) */
const UA =
  'WorksInKoreaBot/0.1 (+https://www.worksinkorea.com; contact: nmcder117@gmail.com)';

/** 애플이 문서에 적어 둔 한도가 분당 20회다. 3.2초면 그 아래다. */
const APPLE_GAP_MS = 3200;
const PLAY_GAP_MS = 1500;

/** 화면에서 가장 크게 쓰는 곳이 44px 다. 3배수로 넉넉히 받는다. */
const PX = 128;

const force = process.argv.includes('--force');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, accept) {
  const res = await fetch(url, {
    headers: { 'user-agent': UA, accept },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
}

/** 애플: 문서화된 lookup API → artworkUrl512 → 크기만 128 로 바꿔서 받는다 */
async function fromApple(appId) {
  for (const country of ['kr', 'us']) {
    const res = await get(
      `https://itunes.apple.com/lookup?id=${encodeURIComponent(appId)}&country=${country}`,
      'application/json',
    );
    const json = await res.json();
    const r = json?.results?.[0];
    if (!r?.artworkUrl512) continue;
    // .../512x512bb.jpg → .../128x128bb.jpg  (애플 CDN 이 지원하는 형태)
    const art = String(r.artworkUrl512).replace(/\/\d+x\d+bb\.(jpg|png)$/, `/${PX}x${PX}bb.jpg`);
    const img = await get(art, 'image/*');
    return {
      buf: Buffer.from(await img.arrayBuffer()),
      source: 'apple',
      appName: r.trackName ?? null,
    };
  }
  return null;
}

/** 구글 플레이: 목록 페이지의 og:image 하나만 읽는다 */
async function fromPlay(pkg) {
  const res = await get(
    `https://play.google.com/store/apps/details?id=${encodeURIComponent(pkg)}&hl=en&gl=US`,
    'text/html',
  );
  const html = await res.text();
  const og = /<meta property="og:image" content="([^"]+)"/.exec(html);
  if (!og) return null;
  const title = /<meta property="og:title" content="([^"]+)"/.exec(html);
  // googleusercontent 는 주소 끝의 =s<크기> 로 크기를 정한다
  const art = `${og[1].split('=')[0]}=s${PX}`;
  const img = await get(art, 'image/*');
  return {
    buf: Buffer.from(await img.arrayBuffer()),
    source: 'play',
    appName: title?.[1]?.replace(/\s*-\s*Apps on Google Play\s*$/i, '').trim() || null,
  };
}

async function exists(p) {
  try {
    const s = await stat(p);
    return s.size > 0;
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const dir = path.join(DATA, 'services');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json'));
  const services = await Promise.all(
    files.map(async (f) => JSON.parse(await readFile(path.join(dir, f), 'utf8'))),
  );
  services.sort((a, b) => a.id.localeCompare(b.id));

  const index = {};
  const kept = [];
  const failed = [];
  let lastApple = 0;
  let lastPlay = 0;

  for (const s of services) {
    const dest = path.join(OUT, `${s.id}.jpg`);

    if (!force && (await exists(dest))) {
      kept.push(s.id);
      index[s.id] = { source: 'cached' };
      continue;
    }

    const ios = typeof s.hints?.ios_app_id === 'string' ? s.hints.ios_app_id : null;
    const pkg = typeof s.hints?.android_package === 'string' ? s.hints.android_package : null;

    if (!ios && !pkg) {
      console.log(`  ·  ${s.id.padEnd(22)} 앱 ID 없음 — 글자 타일로 그린다`);
      continue;
    }

    // 애플에서 실패했다고 거기서 멈추면 안 된다. 앱 ID 가 낡았거나 그 스토어에만
    // 없는 경우가 있고, 그때 플레이에는 멀쩡히 있다. 한쪽 실패는 다른 쪽을 막지 않는다.
    let got = null;
    const why = [];

    if (ios) {
      const wait = APPLE_GAP_MS - (Date.now() - lastApple);
      if (wait > 0) await sleep(wait);
      lastApple = Date.now();
      try {
        got = await fromApple(ios);
        if (!got) why.push(`apple ${ios}: 결과 없음`);
      } catch (err) {
        why.push(`apple ${ios}: ${err.message}`);
      }
    }
    if (!got && pkg) {
      const wait = PLAY_GAP_MS - (Date.now() - lastPlay);
      if (wait > 0) await sleep(wait);
      lastPlay = Date.now();
      try {
        got = await fromPlay(pkg);
        if (!got) why.push(`play ${pkg}: og:image 없음`);
      } catch (err) {
        why.push(`play ${pkg}: ${err.message}`);
      }
    }

    if (!got || got.buf.length < 500) {
      failed.push(`${s.id}: ${why.join(' / ') || '그림을 못 받음'}`);
      console.log(`  ✕  ${s.id.padEnd(22)} ${why.join(' / ')}`);
      continue;
    }

    await writeFile(dest, got.buf);
    index[s.id] = { source: got.source, app_name: got.appName };
    console.log(
      `  ✓  ${s.id.padEnd(22)} ${String(got.source).padEnd(6)} ${(got.buf.length / 1024).toFixed(1)}KB  ${got.appName ?? ''}`,
    );
  }

  const have = (await readdir(OUT)).filter((f) => f.endsWith('.jpg'));
  await writeFile(
    path.join(OUT, 'index.json'),
    `${JSON.stringify(
      {
        note: '앱 아이콘은 각 회사의 상표·저작물이다. 해당 앱을 가리키기 위해서만, 원본 그대로 쓴다. 빼 달라는 요청이 오면 뺀다.',
        contact: 'nmcder117@gmail.com',
        count: have.length,
        sources: index,
      },
      null,
      2,
    )}\n`,
  );

  console.log('');
  console.log(`아이콘 ${have.length}장 / 서비스 ${services.length}곳`);
  if (kept.length) console.log(`이미 있어서 건너뜀 ${kept.length}장 (--force 로 다시 받음)`);
  if (failed.length) {
    console.log('');
    console.log('못 받은 것:');
    failed.forEach((f) => console.log(`  ${f}`));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
