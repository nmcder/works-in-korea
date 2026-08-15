/**
 * 운영자용 작업 목록 생성기.
 *
 * "어떤 서비스에 어떤 힌트를 채워야 측정이 살아나는가"를 우선순위 순으로 뽑아
 * docs/05-hints-todo.md 에 쓴다. 봇이 이미 시도해 본 주소와 실패 사유도 같이 보여주므로
 * 운영자는 사이트에 들어가서 주소만 복사해 오면 된다.
 *
 *   npm run hints
 */
import path from 'node:path';
import { PATHS } from './config.js';
import { log } from './lib/log.js';
import { listServiceIds, loadService, writeJson } from './lib/store.js';
import type { Service } from './types.js';

interface Todo {
  service: Service;
  needs: string[];
  tried: { url: string; status: number | null; reason?: string }[];
  blocked: string | null;
}

async function main(): Promise<void> {
  const ids = await listServiceIds();
  const todos: Todo[] = [];

  for (const id of ids) {
    const service = await loadService(id);
    if (!service) continue;

    const needs: string[] = [];
    const hints = service.hints ?? {};

    const signup = service.signals.signup_phone_auth;
    const signupUnmeasured = signup?.confidence === 'unknown';
    if (signupUnmeasured && !hints.signup_url) needs.push('signup_url');

    const support = service.signals.support_en;
    if (support?.confidence === 'unknown' && !hints.support_url) needs.push('support_url');

    const app = service.signals.app_availability;
    if (app?.confidence === 'unknown' && !hints.ios_app_id && !hints.android_package) {
      needs.push('앱 ID');
    }

    if (needs.length === 0) continue;

    // 봇이 이미 두드려 본 가입 주소 (운영자가 같은 걸 또 시도하지 않도록)
    const attempts =
      (signup?.evidence as { attempts?: { url: string; status: number | null; reason?: string }[] } | null)
        ?.attempts ?? [];

    // robots.txt가 막고 있으면 힌트를 채워도 소용없다 — 별도로 표시한다
    const access = service.signals.overseas_access;
    const accessNote = (access?.evidence as { vantage_points?: { not_measured?: string }[] } | null)
      ?.vantage_points?.[0]?.not_measured;
    const blocked = accessNote?.startsWith('robots:') ? accessNote : null;

    todos.push({ service, needs, tried: attempts.slice(0, 6), blocked });
  }

  const actionable = todos.filter((t) => !t.blocked).sort(byPriority);
  const blockedList = todos.filter((t) => t.blocked).sort(byPriority);

  const lines: string[] = [];
  lines.push('# 운영자 작업 목록 — 힌트 채우기');
  lines.push('');
  lines.push('> 이 파일은 `npm run hints` 로 자동 생성됩니다. 직접 고치지 마세요.');
  lines.push(`> 생성 시각: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## 하는 법 (한 항목당 1~2분)');
  lines.push('');
  lines.push('1. 아래 표의 **서비스 링크**를 클릭해서 사이트를 엽니다.');
  lines.push('2. `signup_url` 이 필요하면 → 그 사이트의 **회원가입** 버튼을 누릅니다.');
  lines.push('   `support_url` 이 필요하면 → **고객센터/문의** 링크를 누릅니다.');
  lines.push('3. 그때 **브라우저 주소창에 뜬 주소를 복사**합니다.');
  lines.push('4. [`data/seeds/services.seed.json`](../data/seeds/services.seed.json) 에서 그 서비스 줄을 찾아');
  lines.push('   `"hints": { ... }` 안에 붙여넣습니다.');
  lines.push('5. 다 채웠으면 `npm run seed` 를 실행하고 커밋합니다.');
  lines.push('');
  lines.push('### 붙여넣는 모양');
  lines.push('');
  lines.push('```jsonc');
  lines.push('// 고치기 전');
  lines.push('{ "id": "kobus", "name": {...}, "url": "https://www.kobus.co.kr", "category": "transport", "importance": 1 }');
  lines.push('');
  lines.push('// 고친 뒤 — 맨 뒤에 "hints" 를 추가한다');
  lines.push('{ "id": "kobus", "name": {...}, "url": "https://www.kobus.co.kr", "category": "transport", "importance": 1,');
  lines.push('  "hints": { "signup_url": "https://www.kobus.co.kr/mrs/join.do" } }');
  lines.push('```');
  lines.push('');
  lines.push('**확신이 없으면 비워 두세요.** 비워 두면 "모름"으로 정직하게 남지만,');
  lines.push('잘못된 주소를 넣으면 틀린 데이터가 공개됩니다.');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`## 지금 채우면 바로 측정이 살아나는 서비스 (${actionable.length}건)`);
  lines.push('');
  lines.push('우선순위 1등급부터 정렬했습니다. **위에서부터 30개만 해도 충분합니다.**');
  lines.push('');

  let currentImportance = 0;
  for (const todo of actionable) {
    if (todo.service.importance !== currentImportance) {
      currentImportance = todo.service.importance;
      lines.push('');
      lines.push(`### 우선순위 ${currentImportance}등급`);
      lines.push('');
      lines.push('| 서비스 | 필요한 힌트 | 봇이 이미 시도해 본 주소 (전부 실패) |');
      lines.push('|---|---|---|');
    }
    const tried =
      todo.tried.length > 0
        ? todo.tried
            .filter((t) => !t.url.includes('(이하 후보)'))
            .map((t) => `\`${shortPath(t.url)}\` → ${t.status ?? t.reason ?? '실패'}`)
            .join('<br>')
        : '—';
    lines.push(
      `| **[${todo.service.name.ko}](${todo.service.url})**<br><sub>\`${todo.service.id}\`</sub> | ${todo.needs.join(', ')} | ${tried} |`,
    );
  }

  if (blockedList.length > 0) {
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push(`## 힌트를 채워도 소용없는 서비스 (${blockedList.length}건) — 손대지 마세요`);
    lines.push('');
    lines.push('robots.txt가 우리 봇의 접근을 전면 금지하고 있어, 주소를 채워도 측정할 수 없습니다.');
    lines.push('이 서비스들은 **커뮤니티 제보로만** 채웁니다 (docs/03-decisions.md D-9).');
    lines.push('');
    lines.push(blockedList.map((t) => `\`${t.service.id}\``).join(', '));
  }

  lines.push('');

  const file = path.join(PATHS.root, 'docs', '05-hints-todo.md');
  const { writeFile, mkdir } = await import('node:fs/promises');
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, lines.join('\n'), 'utf8');

  await writeJson(path.join(PATHS.runs, 'hints-todo.json'), {
    generated_at: new Date().toISOString(),
    actionable: actionable.length,
    blocked_by_robots: blockedList.length,
    by_importance: {
      1: actionable.filter((t) => t.service.importance === 1).length,
      2: actionable.filter((t) => t.service.importance === 2).length,
      3: actionable.filter((t) => t.service.importance === 3).length,
    },
  });

  log.info(`docs/05-hints-todo.md 생성 — 채울 수 있는 것 ${actionable.length}건, robots 차단 ${blockedList.length}건`);
  log.info(
    `  우선순위 1등급: ${actionable.filter((t) => t.service.importance === 1).length}건 ← 여기부터 하면 된다`,
  );
}

function byPriority(a: Todo, b: Todo): number {
  if (a.service.importance !== b.service.importance) return a.service.importance - b.service.importance;
  return a.service.id < b.service.id ? -1 : 1;
}

function shortPath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

main().catch((e: unknown) => {
  log.error(String(e));
  process.exitCode = 1;
});
