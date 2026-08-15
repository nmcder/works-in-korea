/**
 * 공개 레포의 제보 이슈를 구조화해 data/reports/ 에 저장하고,
 * 모인 제보를 집계해 커뮤니티 시그널에 반영한다.
 *
 *   npm run ingest -- --issues=issues.json   공개 레포에서 받아온 이슈 배열
 *   npm run ingest -- --file=issue.json      이슈 1건 (시험용)
 *   npm run ingest -- --reapply              저장된 제보만 다시 집계
 *
 * 제보 폼은 **공개 레포**에 있다 (프라이빗 레포에는 외부인이 이슈를 열 수 없다).
 * 이 레포의 워크플로가 공개 레포의 이슈를 주기적으로 읽어 와 여기에 넘긴다.
 *
 * 이 스크립트는 데이터를 고치기만 하고 PR은 워크플로가 만든다.
 * 사람이 승인하기 전에는 main 에 들어가지 않는다.
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PATHS } from './config.js';
import { log } from './lib/log.js';
import {
  type Report,
  type ReportKind,
  aggregate,
  parseIssueForm,
  readDate,
  readOutcome,
  readServiceId,
  screenForPersonalData,
} from './lib/reports.js';
import { listServiceIds, loadService, saveService, writeJson } from './lib/store.js';

const REPORTS_DIR = path.join(PATHS.root, 'data', 'reports');

/**
 * 이슈에 남길 댓글 문안. 워크플로가 공개 레포에 올린다.
 * 커밋 대상이 아니다 (.gitignore).
 */
const COMMENTS_DIR = path.join(PATHS.root, '.report-comments');

/** 제보가 채우는 시그널 */
const SIGNAL_OF: Record<Exclude<ReportKind, 'correction'>, 'foreign_card' | 'foreign_phone_sms'> = {
  foreign_card: 'foreign_card',
  foreign_phone_sms: 'foreign_phone_sms',
};

interface IssuePayload {
  number: number;
  title: string;
  body: string;
  html_url: string;
  user?: { login?: string } | null;
  labels?: ({ name?: string } | string)[];
  created_at?: string;
}

function kindFromLabels(labels: IssuePayload['labels']): ReportKind | null {
  const names = (labels ?? []).map((l) => (typeof l === 'string' ? l : (l.name ?? '')));
  if (names.includes('report:foreign_card')) return 'foreign_card';
  if (names.includes('report:foreign_phone_sms')) return 'foreign_phone_sms';
  if (names.includes('report:correction')) return 'correction';
  return null;
}

async function toReport(issue: IssuePayload, known: string[]): Promise<Report> {
  const kind = kindFromLabels(issue.labels);
  const fields = parseIssueForm(issue.body ?? '');
  const now = new Date().toISOString();

  const base: Report = {
    id: issue.number,
    kind: kind ?? 'correction',
    service_id: readServiceId(fields.service ?? fields.page, known),
    outcome: readOutcome(fields.outcome),
    origin_country: (fields.origin_country ?? null)?.slice(0, 60) ?? null,
    card_brand: (fields.card_brand ?? null)?.slice(0, 40) ?? null,
    context: (fields.context ?? null)?.slice(0, 80) ?? null,
    tried_on: readDate(fields.tried_on),
    details: null,
    received_at: issue.created_at ?? now,
    source: issue.html_url,
    author: issue.user?.login ?? 'unknown',
    status: 'accepted',
    note: null,
  };

  // 개인정보 검사가 먼저다. 걸리면 본문을 아예 들고 있지 않는다.
  const freeText = [fields.details, fields.observed].filter(Boolean).join('\n');
  const screen = screenForPersonalData(freeText);
  if (!screen.clean) {
    return {
      ...base,
      details: null,
      status: 'rejected',
      note: `개인정보로 보이는 내용이 포함되어 본문을 저장하지 않았다 (${screen.hits.join(', ')}). 이슈를 닫고 제보자에게 다시 요청할 것.`,
    };
  }
  base.details = freeText ? freeText.slice(0, 1000) : null;

  if (kind === null) {
    return { ...base, status: 'needs-review', note: '제보 종류 라벨이 없다' };
  }
  if (kind === 'correction') {
    return {
      ...base,
      status: 'needs-review',
      note: '정정 요청은 자동 반영하지 않는다. 사람이 근거를 확인한 뒤 처리한다.',
    };
  }
  if (!base.service_id) {
    return {
      ...base,
      status: 'needs-review',
      note: `어느 서비스인지 특정하지 못했다 (입력: ${(fields.service ?? '').slice(0, 60)})`,
    };
  }
  if (!base.outcome) {
    return { ...base, status: 'needs-review', note: '결과 선택지를 읽지 못했다' };
  }
  if (!base.tried_on) {
    return {
      ...base,
      status: 'needs-review',
      note: '시도한 날짜가 없다. 날짜 없는 제보는 낡았는지 알 수 없어 값으로 쓰지 않는다.',
    };
  }
  return base;
}

async function loadReports(): Promise<Report[]> {
  try {
    const files = (await readdir(REPORTS_DIR)).filter((f) => f.endsWith('.json'));
    return await Promise.all(
      files.map(async (f) => JSON.parse(await readFile(path.join(REPORTS_DIR, f), 'utf8')) as Report),
    );
  } catch {
    return [];
  }
}

/** 채택된 제보를 모아 커뮤니티 시그널을 다시 쓴다 */
async function applyAll(reports: Report[]): Promise<number> {
  const byTarget = new Map<string, Report[]>();
  for (const r of reports) {
    if (r.kind === 'correction' || !r.service_id) continue;
    const signal = SIGNAL_OF[r.kind];
    const key = `${r.service_id}|${signal}`;
    byTarget.set(key, [...(byTarget.get(key) ?? []), r]);
  }

  let touched = 0;
  const now = new Date().toISOString();

  for (const [key, group] of byTarget) {
    const [id, signal] = key.split('|') as [string, 'foreign_card' | 'foreign_phone_sms'];
    const service = await loadService(id);
    if (!service) {
      log.warn(`제보가 가리키는 서비스를 찾지 못함: ${id}`);
      continue;
    }
    const agg = aggregate(group);
    const previous = service.signals[signal];
    const changed = previous?.value !== agg.value;

    service.signals[signal] = {
      value: agg.value,
      measured_at: now,
      first_seen_at: changed ? now : (previous?.first_seen_at ?? now),
      last_changed_at: changed ? now : (previous?.last_changed_at ?? null),
      method: 'community',
      confidence: agg.confidence,
      evidence: agg.evidence,
    };
    await saveService(service);
    touched += 1;
    log.info(`  ${id}/${signal}: ${agg.value} (${agg.confidence}, 제보 ${group.length}건)`);
  }
  return touched;
}

/** 이미 처리한 이슈인가 (같은 것을 매일 다시 PR로 올리지 않기 위해) */
async function alreadyIngested(id: number): Promise<boolean> {
  try {
    await readFile(path.join(REPORTS_DIR, `${id}.json`), 'utf8');
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const fileArg = argv.find((a) => a.startsWith('--file='))?.slice(7);
  const issuesArg = argv.find((a) => a.startsWith('--issues='))?.slice(9);
  const reapply = argv.includes('--reapply');
  const force = argv.includes('--force');

  await mkdir(REPORTS_DIR, { recursive: true });
  await mkdir(COMMENTS_DIR, { recursive: true });
  const known = await listServiceIds();

  const incoming: IssuePayload[] = [];
  if (fileArg) incoming.push(JSON.parse(await readFile(fileArg, 'utf8')) as IssuePayload);
  if (issuesArg) {
    const parsed = JSON.parse(await readFile(issuesArg, 'utf8')) as unknown;
    if (Array.isArray(parsed)) incoming.push(...(parsed as IssuePayload[]));
  }

  let fresh = 0;
  for (const issue of incoming) {
    // 풀 리퀘스트도 issues 엔드포인트에 섞여 나온다. 제보가 아니다.
    if ((issue as { pull_request?: unknown }).pull_request) continue;
    if (!force && (await alreadyIngested(issue.number))) continue;

    const report = await toReport(issue, known);
    await writeJson(path.join(REPORTS_DIR, `${report.id}.json`), report);
    await writeFile(path.join(COMMENTS_DIR, `${report.id}.md`), commentFor(report), 'utf8');
    fresh += 1;
    log.info(`제보 #${report.id} → ${report.status}${report.note ? ` (${report.note})` : ''}`);
  }

  if (incoming.length > 0) {
    log.info(`받은 이슈 ${incoming.length}건 · 새로 처리 ${fresh}건`);
  }

  if (fresh > 0 || reapply) {
    const all = await loadReports();
    const accepted = all.filter((r) => r.status === 'accepted');
    log.info(`저장된 제보 ${all.length}건 (채택 ${accepted.length}건) → 집계`);
    const touched = await applyAll(accepted);
    log.info(`시그널 ${touched}건 갱신`);
  } else if (incoming.length > 0) {
    log.info('새 제보가 없어 집계를 건너뛴다');
  }
}

function commentFor(r: Report): string {
  if (r.status === 'rejected') {
    return [
      '이 제보에 **개인정보로 보이는 내용**이 포함되어 본문을 저장하지 않았습니다.',
      '',
      '이 프로젝트는 개인정보를 수집하지 않습니다. 번거로우시겠지만 이름·연락처·번호를 빼고',
      '다시 올려주시면 반영하겠습니다.',
      '',
      '---',
      '',
      'This report appeared to contain personal information, so its text was **not stored**.',
      'This project does not collect personal data. Please open a new report without any name,',
      'contact details, or number and it will be recorded.',
    ].join('\n');
  }
  if (r.status === 'needs-review') {
    return [
      `자동 처리하지 못했습니다: ${r.note ?? '사유 미상'}`,
      '',
      '사람이 확인한 뒤 반영합니다. 제보 감사합니다.',
      '',
      '---',
      '',
      `Could not process this automatically: ${r.note ?? 'unknown reason'}`,
      'A human will look at it. Thank you for reporting.',
    ].join('\n');
  }
  return [
    `기록했습니다 — **${r.service_id}** / ${r.kind} / 결과 \`${r.outcome}\` (${r.tried_on} 시도).`,
    '',
    '이 항목은 자동으로 잴 수 없는 값이라 제보가 유일한 데이터원입니다.',
    '검수 후 사이트에 반영되며, 값 옆에 "사람이 제보"로 표시됩니다.',
    '',
    '---',
    '',
    `Recorded — **${r.service_id}** / ${r.kind} / outcome \`${r.outcome}\` (tried ${r.tried_on}).`,
    '',
    'This value cannot be measured by machine, so first-hand reports are the only source.',
    'After review it appears on the site, marked "reported by people".',
  ].join('\n');
}

main().catch((e: unknown) => {
  log.error(String(e));
  process.exitCode = 1;
});
