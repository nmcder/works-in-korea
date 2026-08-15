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

/**
 * 사이트가 우리 봇을 막고 있는가.
 *
 * 세 가지 전부 "우리가 이 사이트에 닿을 수 없다"는 같은 결론이지만 원인은 다르다.
 * 주소를 채워도 소용없다는 점에서만 같이 묶는다. (present.ts 의 classifyBlock 과 같은 기준)
 */
function siteBlocked(service: Service): string | null {
  const sig = service.signals.overseas_access;
  if (!sig || sig.confidence !== 'unknown') return null;
  const raw = JSON.stringify(sig.evidence ?? {});
  if (/robots-unavailable/.test(raw)) return '해외에서 응답 없음';
  if (/robots:\s*Disallow/i.test(raw)) return 'robots.txt 금지';
  if (/"http_status":\s*(403|429)/.test(raw)) return '크롤러 거부 (403/429)';
  return null;
}

async function main(): Promise<void> {
  const ids = await listServiceIds();
  const todos: Todo[] = [];
  const blockedServices: Todo[] = [];

  for (const id of ids) {
    const service = await loadService(id);
    if (!service) continue;

    const siteBlock = siteBlocked(service);
    if (siteBlock) {
      blockedServices.push({ service, needs: ['앱 ID'], tried: [], blocked: siteBlock });
    }

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

    todos.push({ service, needs, tried: attempts.slice(0, 6), blocked: siteBlock });
  }

  // 사이트가 막힌 곳은 주소를 채워도 소용없으므로 "지금 하면 되는 일"에서 뺀다
  const actionable = todos.filter((t) => !t.blocked).sort(byPriority);

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

  // 자동 접근이 막힌 서비스도 앱 ID 는 채울 수 있다.
  // 앱 여부는 애플·구글에 묻는 것이라 그 사이트의 차단과 무관하기 때문이다.
  // 이 구분을 안 하면 "손대지 마세요" 한 줄이 31곳을 영원히 빈칸으로 남긴다.
  const appFillable = blockedServices.sort(byPriority);

  if (appFillable.length > 0) {
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push(`## 자동 접근이 막힌 서비스 (${appFillable.length}건) — 앱 ID만 채울 수 있습니다`);
    lines.push('');
    lines.push('이 서비스들은 사이트가 우리 봇을 막고 있어 가입 주소·고객센터 주소를 채워도 소용없습니다.');
    lines.push('**앱 정보는 다릅니다.** 앱이 스토어에 있는지는 애플·구글에 묻는 것이라 그 사이트의 차단과');
    lines.push('무관합니다. 지금 이 31곳은 한 칸도 채워져 있지 않은데, 앱 ID 하나만 넣어도 빈 줄이 아니게 됩니다.');
    lines.push('');
    lines.push('### 하는 법');
    lines.push('');
    lines.push('아래 표의 **Play** 나 **App Store** 링크를 눌러 앱을 찾은 다음, 주소창을 복사해서 붙여넣습니다.');
    lines.push('');
    lines.push('```bash');
    lines.push('npm run add-app -- coupang "https://play.google.com/store/apps/details?id=com.coupang.mobile"');
    lines.push('```');
    lines.push('');
    lines.push('주소는 **반드시 따옴표로 감싸세요.** `?` 와 `&` 가 있어서 그냥 넣으면 잘립니다.');
    lines.push('두 스토어를 한 줄에 같이 줘도 되고, 하나만 줘도 됩니다.');
    lines.push('');
    lines.push('도구가 스토어에 실제로 있는지 확인하고 **앱 이름을 찍어 줍니다.** 이름이 엉뚱하면 잘못 복사한 것이니');
    lines.push('다시 하면 됩니다. 없는 ID 는 아예 기록하지 않습니다.');
    lines.push('');
    lines.push('다 넣은 뒤 `npm run seed` 를 한 번 돌리고 커밋하면 끝입니다.');
    lines.push('');
    lines.push('| 서비스 | 이미 있는 것 | 스토어에서 찾기 |');
    lines.push('|---|---|---|');
    for (const t of appFillable) {
      const h = t.service.hints ?? {};
      const have = [
        h.ios_app_id ? `iOS \`${h.ios_app_id}\`` : null,
        h.android_package ? `Play \`${h.android_package}\`` : null,
      ].filter(Boolean);
      const q = encodeURIComponent(t.service.name.ko);
      const search = [
        h.android_package ? null : `[Play](https://play.google.com/store/search?q=${q}&c=apps)`,
        h.ios_app_id ? null : `[App Store](https://www.apple.com/kr/search/${q}?src=serp)`,
      ]
        .filter(Boolean)
        .join(' · ');
      lines.push(
        `| **${t.service.name.ko}**<br><sub>\`${t.service.id}\`</sub> | ${have.length > 0 ? have.join('<br>') : '없음'} | ${search} |`,
      );
    }
  }

  lines.push('');

  const file = path.join(PATHS.root, 'docs', '05-hints-todo.md');
  const { writeFile, mkdir } = await import('node:fs/promises');
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, lines.join('\n'), 'utf8');

  await writeJson(path.join(PATHS.runs, 'hints-todo.json'), {
    generated_at: new Date().toISOString(),
    actionable: actionable.length,
    site_blocked: appFillable.length,
    app_id_missing: appFillable.filter(
      (t) => !t.service.hints?.ios_app_id && !t.service.hints?.android_package,
    ).length,
    by_importance: {
      1: actionable.filter((t) => t.service.importance === 1).length,
      2: actionable.filter((t) => t.service.importance === 2).length,
      3: actionable.filter((t) => t.service.importance === 3).length,
    },
  });

  log.info(
    `docs/05-hints-todo.md 생성 — 주소를 채울 곳 ${actionable.length}건, 앱 ID만 채울 수 있는 곳 ${appFillable.length}건`,
  );
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
