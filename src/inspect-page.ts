/**
 * 페이지 단건 진단 도구.
 *
 * 프로브가 "왜 그렇게 판정했는지"를 사람이 눈으로 확인할 때 쓴다.
 * 렌더링된 DOM에서 본인인증·PG 시그니처가 실제로 잡히는지, 페이지 종류가 뭔지 보여준다.
 *
 *   npm run inspect -- https://accounts.kt.com/identify/personal
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PATHS } from './config.js';
import { closeBrowser, snapshotPage } from './lib/browser.js';
import { log } from './lib/log.js';
import { detectPageKind } from './lib/page-kind.js';

interface VendorSig {
  id: string;
  name: string;
  url: string[];
  text: string[];
}

async function main(): Promise<void> {
  const urls = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  if (urls.length === 0) {
    log.error('사용법: npm run inspect -- <url> [<url> ...]');
    process.exitCode = 1;
    return;
  }

  const sigs = JSON.parse(
    await readFile(path.join(PATHS.signatures, 'identity-verification.json'), 'utf8'),
  ) as { vendors: VendorSig[] };

  for (const url of urls) {
    console.log(`\n${'='.repeat(70)}\n${url}`);
    const page = await snapshotPage(url);

    if (!page.ok || !page.html) {
      console.log(`  열지 못함: ${page.blockedReason ?? page.error}`);
      continue;
    }

    const kind = detectPageKind(page.html, page.visibleText ?? '');
    console.log(`  최종 주소 : ${page.finalUrl}`);
    console.log(`  상태코드   : ${page.status}`);
    console.log(`  페이지 종류 : ${kind.kind} (가입표시 ${kind.signupMarkers.join('/') || '없음'} · 로그인표시 ${kind.loginMarkers.join('/') || '없음'})`);
    console.log(`  DOM 크기   : ${page.html.length}자, 로드한 URL ${page.requestedUrls.length}개`);

    const haystackUrls = page.requestedUrls.join('\n').toLowerCase();
    const haystackText = `${page.visibleText ?? ''}\n${page.html}`;
    const hits: string[] = [];
    for (const v of sigs.vendors) {
      const u = v.url.find((n) => haystackUrls.includes(n.toLowerCase()));
      if (u) hits.push(`${v.name} (url:${u})`);
      else {
        const t = v.text.find((n) => haystackText.includes(n));
        if (t) hits.push(`${v.name} (text:${t})`);
      }
    }
    console.log(`  본인인증 시그니처: ${hits.length ? hits.join(', ') : '탐지 없음'}`);

    // 본인인증과 관련 있어 보이는 단어가 본문에 있는지 (시그니처 사전 보완용)
    const probe = ['본인인증', '본인 확인', '휴대폰', '통신사', 'PASS', '인증번호', '실명', '외국인', '주민등록'];
    const found = probe.filter((w) => haystackText.includes(w));
    console.log(`  관련 단어  : ${found.join(', ') || '없음'}`);
    console.log(`  본문 앞부분 : ${(page.visibleText ?? '').slice(0, 300)}`);
  }

  await closeBrowser();
}

main().catch(async (e: unknown) => {
  log.error(String(e));
  await closeBrowser();
  process.exitCode = 1;
});
