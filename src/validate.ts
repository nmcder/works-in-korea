/**
 * data/services/*.json 전수 검증.
 *
 * 1) JSON Schema (schema/service.schema.json)
 * 2) 스키마로 표현하기 어려운 프로젝트 규칙:
 *    - 파일명과 id 일치
 *    - 시드 목록과 1:1 대응
 *    - 측정된 시그널은 반드시 메타 3종을 갖출 것
 *    - confidence=auto 인데 evidence가 비어 있으면 실패 (반증 가능성 상실)
 * 3) 우리 데이터가 우리 데이터와 어긋나는 곳 (src/lib/contradictions.ts)
 *
 *   npm run validate            어긋난 곳은 경고로 보여주고, 장부 오류만 실패시킨다
 *   npm run validate -- --strict  경고도 실패로 친다 (손으로 정리하고 나서 확인할 때)
 */
import { appendFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { Ajv2020 } from 'ajv/dist/2020.js';
import ajvFormats from 'ajv-formats';

// ajv-formats는 CJS라 NodeNext ESM에서 default를 한 단계 벗겨야 한다.
const addFormats = ajvFormats.default;
import { PATHS } from './config.js';
import { findContradictions, type Finding } from './lib/contradictions.js';
import { log } from './lib/log.js';
import { listServiceIds, loadSeeds } from './lib/store.js';
import { SIGNAL_KEYS, type Service } from './types.js';

/**
 * 크론이 돌 때는 아무도 로그를 안 읽는다. Actions 실행 요약 칸에 붙여 둔다.
 * 그 칸은 실행 목록에서 바로 보이고, 링크를 눌러 들어갈 필요가 없다.
 */
async function writeStepSummary(warnings: Finding[]): Promise<void> {
  const dest = process.env.GITHUB_STEP_SUMMARY;
  if (!dest) return;
  const lines = ['', '### 어긋난 값', ''];
  if (warnings.length === 0) {
    lines.push('없음.');
  } else {
    lines.push(`${warnings.length}건. 사람이 열어 봐야 한다.`, '', '| 서비스 | 무엇이 어긋났나 |', '|---|---|');
    for (const w of warnings.slice(0, 40)) {
      lines.push(`| \`${w.service_id}\` | ${w.message.replace(/\|/g, '\\|')} |`);
    }
    if (warnings.length > 40) lines.push(`| … | 외 ${warnings.length - 40}건 |`);
  }
  await appendFile(dest, `${lines.join('\n')}\n`, 'utf8');
}

async function main(): Promise<void> {
  const schema = JSON.parse(await readFile(PATHS.schema, 'utf8')) as object;
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  const seeds = await loadSeeds();
  const seedIds = new Set(seeds.map((s) => s.id));
  const ids = await listServiceIds();

  const problems: string[] = [];
  const services: Service[] = [];

  for (const id of ids) {
    const file = path.join(PATHS.services, `${id}.json`);
    let service: Service;
    try {
      service = JSON.parse(await readFile(file, 'utf8')) as Service;
    } catch (e) {
      problems.push(`${id}: JSON 파싱 실패 — ${String(e)}`);
      continue;
    }
    services.push(service);

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

  /*
   * 어긋난 값. 장부 오류(error)는 실패로, 의심(warn)은 경고로 남긴다.
   * 경고를 실패로 만들면 크론이 그날 측정 결과를 통째로 버리게 된다 —
   * "확실하지 않다"는 이유로 잰 것을 버리는 것은 이 프로젝트가 하려는 일의 반대다.
   */
  const findings = findContradictions(services);
  const conflicts = findings.filter((f) => f.level === 'error');
  const warnings = findings.filter((f) => f.level === 'warn');
  const strict = process.argv.includes('--strict');

  for (const c of conflicts) problems.push(`${c.service_id}: ${c.message}  [${c.rule}]`);
  if (strict) {
    for (const w of warnings) problems.push(`${w.service_id}: ${w.message}  [${w.rule}]`);
  }

  await writeStepSummary(warnings);

  if (problems.length > 0) {
    log.error(`검증 실패 — ${problems.length}건`);
    for (const p of problems.slice(0, 100)) log.error(`  ${p}`);
    if (problems.length > 100) log.error(`  ... 외 ${problems.length - 100}건`);
    process.exitCode = 1;
    return;
  }

  if (warnings.length > 0) {
    log.warn(`어긋난 값 ${warnings.length}건 — 실패는 아니지만 사람이 열어 봐야 한다`);
    const byRule = new Map<string, Finding[]>();
    for (const w of warnings) byRule.set(w.rule, [...(byRule.get(w.rule) ?? []), w]);
    for (const [rule, list] of byRule) {
      log.warn(`  [${rule}] ${list.length}건`);
      for (const w of list) log.warn(`    ${w.service_id}: ${w.message}`);
    }
    log.warn('  고칠 것이 없다고 판단했으면 그대로 두면 된다. 이 검사는 통과를 막지 않는다.');
  }

  log.info(`검증 통과 — 서비스 ${ids.length}건, 시그널 ${ids.length * SIGNAL_KEYS.length}개`);
}

main().catch((e: unknown) => {
  log.error(String(e));
  process.exitCode = 1;
});
