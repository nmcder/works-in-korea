/**
 * 주소 검증 도구.
 *
 * 시드에 힌트를 넣기 전에 "그 주소가 살아 있는지, 어떤 종류의 페이지인지"를 확인한다.
 * 죽은 주소나 로그인 전용 페이지를 힌트로 넣으면 틀린 데이터가 공개되므로,
 * 커밋 전에 반드시 이걸로 거른다.
 *
 *   npm run check-urls -- https://a.com/join https://b.com/help
 *   npm run check-urls -- --file=urls.txt
 *   npm run check-urls                        (시드의 모든 힌트를 검증)
 */
import { readFile } from 'node:fs/promises';
import { politeFetch, visibleText } from './lib/http.js';
import { log } from './lib/log.js';
import { loadSeeds } from './lib/store.js';
import { detectPageKind } from './lib/page-kind.js';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const fileArg = args.find((a) => a.startsWith('--file='));

  let targets: { label: string; url: string }[];

  if (fileArg) {
    const raw = await readFile(fileArg.slice('--file='.length), 'utf8');
    targets = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l !== '' && !l.startsWith('#'))
      .map((l) => {
        const [label, url] = l.includes('\t') ? l.split('\t') : [l, l];
        return { label: (label ?? l).trim(), url: (url ?? l).trim() };
      });
  } else if (args.filter((a) => !a.startsWith('--')).length > 0) {
    targets = args.filter((a) => !a.startsWith('--')).map((u) => ({ label: u, url: u }));
  } else {
    // 인자가 없으면 시드에 들어 있는 모든 힌트 주소를 검증한다
    const seeds = await loadSeeds();
    targets = [];
    for (const s of seeds) {
      for (const key of ['signup_url', 'support_url', 'checkout_url', 'english_url'] as const) {
        const url = s.hints?.[key];
        if (url) targets.push({ label: `${s.id}.${key}`, url });
      }
    }
    log.info(`시드 힌트 ${targets.length}건 검증`);
  }

  let problems = 0;

  for (const { label, url } of targets) {
    const res = await politeFetch(url, { headers: { 'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8' } });

    if (res.blockedReason) {
      console.log(`  BLOCKED  ${label}\n           ${url}\n           ${res.blockedReason}`);
      problems += 1;
      continue;
    }
    if (res.error !== null) {
      console.log(`  ERROR    ${label}\n           ${url}\n           ${res.error}`);
      problems += 1;
      continue;
    }

    const status = res.status ?? 0;
    const ok = status >= 200 && status < 400;
    const kind = res.body ? detectPageKind(res.body, visibleText(res.body, 12000)) : null;
    const redirected = res.redirected ? ` → ${res.finalUrl}` : '';

    const flag = !ok ? 'DEAD' : kind?.kind === 'login' ? 'LOGIN만' : 'OK';
    if (flag !== 'OK') problems += 1;

    console.log(
      `  ${flag.padEnd(8)} ${label}\n           ${url}${redirected}\n` +
        `           status=${status}${kind ? ` kind=${kind.kind} (가입표시:${kind.signupMarkers.length} 로그인표시:${kind.loginMarkers.length})` : ''}`,
    );
  }

  log.info(`검증 완료 — ${targets.length}건 중 문제 ${problems}건`);
}

main().catch((e: unknown) => {
  log.error(String(e));
  process.exitCode = 1;
});
