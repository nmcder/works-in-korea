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
    endpoints: {
      services: '/api/v1/services.json',
      service: '/api/v1/services/{id}.json',
      changes: '/api/v1/changes.json',
      meta: '/api/v1/meta.json',
    },
  };

  await writeFile(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 2));
  await writeFile(
    path.join(OUT, 'services.json'),
    JSON.stringify({ ...meta, services }, null, 2),
  );
  for (const s of services) {
    await writeFile(
      path.join(OUT, 'services', `${s.id}.json`),
      JSON.stringify({ generated_at, license: LICENSE, service: s }, null, 2),
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
  await writeFile(
    path.join(OUT, 'changes.json'),
    JSON.stringify({ generated_at, license: LICENSE, days }, null, 2),
  );

  console.log(
    `[api] ${services.length} services · ${days.length} change days → site/public/api/v1/`,
  );
}

main().catch((e) => {
  console.error('[api] 실패:', e);
  process.exit(1);
});
