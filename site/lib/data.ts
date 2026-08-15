/**
 * 빌드 시점에 `data/` 를 읽어 페이지에 넘긴다.
 *
 * 런타임에는 아무것도 읽지 않는다 — `output: 'export'` 라서 결과물이 순수 HTML/JS다.
 * 즉 이 파일의 모든 함수는 `next build` 중에만 실행된다. (서버 0대 원칙)
 *
 * 데이터가 바뀌는 유일한 경로: 크론이 측정 → JSON 커밋 → 사이트 재빌드.
 */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { type BlockKind, crawlBlock } from './present';
import type { ChangeFile, RunSummary, Service, SignalKey } from './types';

/** 레포 루트의 data/. 사이트를 다른 위치에서 빌드해야 하면 WIK_DATA_DIR 로 덮어쓴다. */
// 빈 문자열은 미설정으로 본다. ?? 로 받으면 빈 값이 통과해 경로가 '' 가 된다.
const DATA_DIR = process.env.WIK_DATA_DIR?.trim() || path.join(process.cwd(), '..', 'data');

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, 'utf8')) as T;
}

let servicesCache: Promise<Service[]> | null = null;

/** 서비스 전체. 이름 기준 정렬(영문) — 중요도 정렬은 화면 쪽에서 한다. */
export function getServices(): Promise<Service[]> {
  servicesCache ??= (async () => {
    const dir = path.join(DATA_DIR, 'services');
    const files = (await readdir(dir)).filter((f) => f.endsWith('.json'));
    const services = await Promise.all(files.map((f) => readJson<Service>(path.join(dir, f))));
    return services.sort((a, b) => a.name.en.localeCompare(b.name.en, 'en'));
  })();
  return servicesCache;
}

export async function getService(id: string): Promise<Service | null> {
  const all = await getServices();
  return all.find((s) => s.id === id) ?? null;
}

export async function getLatestRun(): Promise<RunSummary | null> {
  try {
    return await readJson<RunSummary>(path.join(DATA_DIR, 'runs', 'latest.json'));
  } catch {
    return null;
  }
}

/** 날짜 역순(최신 먼저). 변경이 0건인 날의 파일은 건너뛴다. */
export async function getChangeFiles(): Promise<ChangeFile[]> {
  const dir = path.join(DATA_DIR, 'changes');
  let files: string[];
  try {
    files = (await readdir(dir)).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f));
  } catch {
    return [];
  }
  const parsed = await Promise.all(files.map((f) => readJson<ChangeFile>(path.join(dir, f))));
  return parsed
    .filter((c) => c.changes.length > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
}

export interface CoverageRow {
  key: SignalKey;
  measured: number;
  unmeasured: number;
  total: number;
}

/**
 * 시그널별로 "값이 있는 것 / 모르는 것"을 센다.
 *
 * 이 수치를 사이트 앞면에 그대로 내거는 것이 이 제품의 성격이다.
 * 커버리지를 감추면 낡은 정보와 구분이 안 되고, 그 순간 기존 블로그 글과 같아진다.
 */
export async function getCoverage(): Promise<CoverageRow[]> {
  const services = await getServices();
  const keys: SignalKey[] = [
    'overseas_access',
    'i18n_ui',
    'signup_phone_auth',
    'app_availability',
    'payment_gate',
    'support_en',
    'foreign_card',
    'foreign_phone_sms',
  ];
  return keys.map((key) => {
    let measured = 0;
    for (const s of services) {
      const sig = s.signals[key];
      if (sig && sig.confidence !== 'unknown' && sig.value !== null) measured += 1;
    }
    return { key, measured, unmeasured: services.length - measured, total: services.length };
  });
}

/**
 * robots.txt 나 봇 차단으로 자동 측정이 막힌 서비스.
 *
 * "아직 안 쟀다"와 "회사가 자동 접근을 막아서 영원히 못 잰다"는 다른 사실이고,
 * 후자는 제보가 유일한 데이터원이라는 뜻이다. (docs/03-decisions.md D-9)
 */
export interface BlockedService {
  service: Service;
  kind: NonNullable<BlockKind>;
}

export async function getBlockedServices(): Promise<BlockedService[]> {
  const services = await getServices();
  const out: BlockedService[] = [];
  for (const service of services) {
    const kind = crawlBlock(service);
    if (kind) out.push({ service, kind });
  }
  return out;
}

/** 종류별 개수 — 화면에서 "robots가 막은 것"과 "서버가 응답 안 한 것"을 구분해 보여준다 */
export async function getBlockCounts(): Promise<Record<NonNullable<BlockKind>, number>> {
  const blocked = await getBlockedServices();
  const counts = {
    'robots-disallow': 0,
    'bot-block': 0,
    unreachable: 0,
    tls: 0,
    'robots-unreadable': 0,
  };
  for (const b of blocked) counts[b.kind] += 1;
  return counts;
}

/** 사이트가 언제 만들어졌는지. 데이터 신선도와 별개로 표시한다. */
export function getBuildTime(): string {
  return new Date().toISOString();
}
