/**
 * data/services/*.json 전수 검증.
 *
 * 1) JSON Schema (schema/service.schema.json)
 * 2) 스키마로 표현하기 어려운 프로젝트 규칙:
 *    - 파일명과 id 일치
 *    - 시드 목록과 1:1 대응
 *    - 측정된 시그널은 반드시 메타 3종을 갖출 것
 *    - confidence=auto 인데 evidence가 비어 있으면 실패 (반증 가능성 상실)
 *
 *   npm run validate
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Ajv2020 } from 'ajv/dist/2020.js';
import ajvFormats from 'ajv-formats';

// ajv-formats는 CJS라 NodeNext ESM에서 default를 한 단계 벗겨야 한다.
const addFormats = ajvFormats.default;
import { PATHS } from './config.js';
import { log } from './lib/log.js';
import { listServiceIds, loadSeeds } from './lib/store.js';
import { SIGNAL_KEYS, type Service } from './types.js';

async function main(): Promise<void> {
  const schema = JSON.parse(await readFile(PATHS.schema, 'utf8')) as object;
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  const seeds = await loadSeeds();
  const seedIds = new Set(seeds.map((s) => s.id));
  const ids = await listServiceIds();

  const problems: string[] = [];

  for (const id of ids) {
    const file = path.join(PATHS.services, `${id}.json`);
    let service: Service;
    try {
      service = JSON.parse(await readFile(file, 'utf8')) as Service;
    } catch (e) {
      problems.push(`${id}: JSON 파싱 실패 — ${String(e)}`);
      continue;
    }

    if (!validate(service)) {
      for (const err of validate.errors ?? []) {
        problems.push(`${id}${err.instancePath}: ${err.message ?? 'schema error'}`);
      }
    }

    if (service.id !== id) problems.push(`${id}: 파일명과 id 불일치 (id=${service.id})`);
    if (!seedIds.has(id)) {
      problems.push(`${id}: 시드 목록에 없다. data/seeds/services.seed.json 에 추가하거나 파일을 지울 것`);
    }

    for (const key of SIGNAL_KEYS) {
      const signal = service.signals[key];
      if (!signal) {
        problems.push(`${id}.signals.${key}: 시그널 키 누락`);
        continue;
      }
      if (signal.measured_at !== null && signal.method === 'none') {
        problems.push(`${id}.signals.${key}: 측정됐는데 method가 none`);
      }
      if (signal.confidence === 'auto' && (signal.evidence === null || Object.keys(signal.evidence).length === 0)) {
        problems.push(
          `${id}.signals.${key}: confidence=auto 인데 evidence가 비어 있다 (반증 불가능한 값은 실을 수 없다)`,
        );
      }
      if (signal.measured_at === null && signal.confidence !== 'unknown') {
        problems.push(`${id}.signals.${key}: 미측정인데 confidence가 unknown이 아니다`);
      }
    }
  }

  const missing = [...seedIds].filter((id) => !ids.includes(id));
  if (missing.length > 0) {
    problems.push(`시드에 있으나 파일이 없는 서비스: ${missing.join(', ')} — npm run seed 를 돌릴 것`);
  }

  if (problems.length > 0) {
    log.error(`검증 실패 — ${problems.length}건`);
    for (const p of problems.slice(0, 100)) log.error(`  ${p}`);
    if (problems.length > 100) log.error(`  ... 외 ${problems.length - 100}건`);
    process.exitCode = 1;
    return;
  }

  log.info(`검증 통과 — 서비스 ${ids.length}건, 시그널 ${ids.length * SIGNAL_KEYS.length}개`);
}

main().catch((e: unknown) => {
  log.error(String(e));
  process.exitCode = 1;
});
