/**
 * 공개 JSON API 생성기.
 *
 * data/ 를 읽어 site/public/api/v1/ 아래에 정적 파일로 뽑는다.
 * 서버가 없으므로 API도 그냥 파일이다 — 정적 호스팅이 알아서 서빙한다.
 *
 * next build / next dev 앞에 자동으로 돈다 (package.json 의 prebuild·predev).
 */
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.join(HERE, '..');
const DATA = process.env.WIK_DATA_DIR ?? path.join(SITE, '..', 'data');
const OUT = path.join(SITE, 'public', 'api', 'v1');

const LICENSE = {
  name: 'CC BY 4.0',
  url: 'https://creativecommons.org/licenses/by/4.0/',
  attribution: 'Works in Korea?',
};

// lib/site-config.ts 와 같은 환경변수를 본다. 여기만 박아 두면 도메인을 옮기는 날
// 사이트는 새 주소를 말하고 API 는 옛 주소를 말한다 — 그리고 인용되는 것은 API 쪽이다.
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.worksinkorea.com').replace(/\/+$/, '');

/**
 * 레코드마다 **우리 페이지 주소를 박아 준다.**
 *
 * 왜: 2026-08-17 까지 이 API 의 서비스 레코드에 들어 있는 URL 은 `url` 하나였고,
 * 그건 **그 서비스 자신의 주소**(예: kakaomobility.com)였다. 우리 주소는 한 글자도
 * 없었다. 이 JSON 을 읽은 쪽이 "출처가 어디냐"를 만나면 거기 있는 유일한 URL 을 쓴다.
 * 즉 우리가 남의 링크를 손에 쥐여 주고 있었다. 인용을 안 해 준 것이 아니라
 * **인용할 것을 안 준 것**이고, 이건 부탁하는 문장으로는 고쳐지지 않는다.
 *
 * 시그널마다도 붙인다. 값 하나만 뽑아 간 쪽이 그 값 하나를 정확히 가리킬 수 있어야
 * "카카오T 페이지" 대신 "카카오T 의 가입 조건" 을 걸 수 있다. 앵커 이름은 시그널 키
 * 그대로이고, 상세 페이지의 각 항목에 같은 id 가 붙어 있다.
 *
 * data/services/*.json 에는 넣지 않는다. id 에서 만들어지는 값이라 저장하면 같은
 * 사실이 두 곳에 남고, 도메인이 바뀌는 날 한쪽만 고쳐진다. 내보낼 때만 만든다.
 */
function withSource(service) {
  const page = `${SITE_URL}/service/${service.id}/`;
  const { signals, ...rest } = service;
  return {
    ...rest,
    source_url: page,
    signals: Object.fromEntries(
      Object.entries(signals ?? {}).map(([key, sig]) => [
        key,
        sig === null || sig === undefined ? sig : { ...sig, source_url: `${page}#${key}` },
      ]),
    ),
  };
}

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

/**
 * data/ 가 안 보이면 여기서 이유를 분명히 밝히고 멈춘다.
 *
 * 이 실수는 Vercel에서 거의 반드시 한 번은 난다: Root Directory 를 `site` 로 잡으면
 * 기본 설정이 상위 폴더를 빌드에 포함하지 않아 `../data` 가 통째로 사라진다.
 * 그때 나오는 기본 오류 메시지로는 원인을 알 수 없으므로 직접 적어 준다.
 */
async function assertDataDir() {
  try {
    await readdir(path.join(DATA, 'services'));
  } catch {
    console.error(
      [
        '',
        '  [api] 측정 데이터를 찾을 수 없습니다.',
        `        찾은 위치: ${path.join(DATA, 'services')}`,
        '',
        '  Vercel에 배포 중이라면 십중팔구 이것입니다:',
        '    Settings → Build and Deployment → Root Directory 에서',
        '    "Include files outside of the Root Directory in the Build Step" 를 켜세요.',
        '    (Root Directory 를 site 로 지정하면 기본값이 꺼져 있어 ../data 가 사라집니다)',
        '',
        '  If deploying on Vercel: enable "Include files outside of the Root Directory',
        '  in the Build Step" — the site reads ../data at build time.',
        '',
      ].join('\n'),
    );
    process.exit(1);
  }
}

async function main() {
  await assertDataDir();
  await rm(OUT, { recursive: true, force: true });
  await mkdir(path.join(OUT, 'services'), { recursive: true });

  const dir = path.join(DATA, 'services');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.json'));
  const services = [];
  for (const f of files) services.push(await readJson(path.join(dir, f)));
  services.sort((a, b) => a.id.localeCompare(b.id));

  let run = null;
  try {
    run = await readJson(path.join(DATA, 'runs', 'latest.json'));
  } catch {
    /* 최초 실행 전이면 없을 수 있다 */
  }

  const generated_at = new Date().toISOString();
  const meta = {
    generated_at,
    license: LICENSE,
    services_total: services.length,
    last_run: run,
    note:
      'Every signal carries measured_at, method and confidence. A confidence of "unknown" means we did not measure it — the evidence object says why. Do not treat a missing value as a negative result.',
    fields: {
      url: "The service's own website. This is not us.",
      source_url:
        'Our page for this service. Cite this URL. Each signal also has its own source_url with an anchor, e.g. .../service/kakao-t/#signup_phone_auth, which links straight to that one value and its evidence.',
    },
    cite_as: `"Works in Korea?", <source_url>, measured <measured_at>`,
    endpoints: {
      services: '/api/v1/services.json',
      service: '/api/v1/services/{id}.json',
      changes: '/api/v1/changes.json',
      meta: '/api/v1/meta.json',
    },
  };

  const published = services.map(withSource);

  await writeFile(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 2));
  await writeFile(
    path.join(OUT, 'services.json'),
    JSON.stringify({ ...meta, services: published }, null, 2),
  );
  for (const s of published) {
    await writeFile(
      path.join(OUT, 'services', `${s.id}.json`),
      JSON.stringify(
        {
          generated_at,
          license: LICENSE,
          source_url: s.source_url,
          cite_as: meta.cite_as,
          service: s,
        },
        null,
        2,
      ),
    );
  }

  // 변경 이력 — 날짜 역순으로 하나에 합친다
  let days = [];
  try {
    const cdir = path.join(DATA, 'changes');
    const cfiles = (await readdir(cdir)).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f));
    for (const f of cfiles) days.push(await readJson(path.join(cdir, f)));
    days = days.filter((d) => d.changes.length > 0).sort((a, b) => b.date.localeCompare(a.date));
  } catch {
    /* 변경 파일이 아직 없을 수 있다 */
  }
  /*
   * 변경 기록에도 우리 주소를 붙인다.
   *
   * 이 파일에는 worksinkorea.com 이 한 글자도 없었다. 항목이 `{service_id, signal, from, to}`
   * 뿐이라, "코레일이 며칠에 이렇게 바뀌었다" 는 이 데이터에서 제일 인용하기 좋은 문장인데
   * 인용할 주소가 없었다 — 구조상 출처를 달 수 없는 파일이었다.
   * 이름도 같이 준다. id 만 있으면 인용하는 쪽이 사람이 읽을 이름을 지어내야 한다.
   */
  const named = new Map(services.map((s) => [s.id, s.name]));
  const daysWithSource = days.map((d) => ({
    ...d,
    changes: d.changes.map((c) => ({
      ...c,
      service_name: named.get(c.service_id) ?? null,
      source_url: `${SITE_URL}/service/${c.service_id}/#${c.signal}`,
    })),
  }));

  await writeFile(
    path.join(OUT, 'changes.json'),
    JSON.stringify(
      { generated_at, license: LICENSE, cite_as: meta.cite_as, days: daysWithSource },
      null,
      2,
    ),
  );

  console.log(
    `[api] ${services.length} services · ${days.length} change days → site/public/api/v1/`,
  );
}

main().catch((e) => {
  console.error('[api] 실패:', e);
  process.exit(1);
});
