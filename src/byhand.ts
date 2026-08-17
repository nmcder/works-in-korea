/**
 * 운영자가 직접 눈으로 확인할 목록을 만든다.  `npm run byhand`
 *
 * 코워크가 못 하는 것이 두 무리 남았다.
 *   1. 브라우저 확장이 안전 정책으로 막는 곳 — 네이버·쿠팡·11번가·토스·SSG·IBK·케이뱅크
 *   2. 이미 로그인돼 있어 신규 방문자 화면을 볼 수 없는 곳 — 카카오 계열·TVING·리디
 *
 * 둘 다 도구를 바꾼다고 풀리지 않는다. 사람이 시크릿 창에서 열면 5초다.
 *
 * ── 왜 JSON 을 손으로 쓰게 하지 않는가
 *
 * 87개 항목을 JSON 으로 적게 하면 중간에 쉼표 하나가 빠지고, 그걸 찾느라 지치고,
 * 결국 안 하게 된다. 운영자는 코드를 쓰지 않는 사람이다 (CLAUDE.md 2장).
 * 그래서 **읽기 쉬운 표를 만들어 주고, 같은 파일을 그대로 다시 읽어들인다.**
 * 채울 곳은 두 줄뿐이다 — `답:` 과 `본 것:`.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listServiceIds, loadService } from './lib/store.js';
import type { Service, SignalKey } from './types.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECKABLE: SignalKey[] = ['signup_phone_auth', 'i18n_ui', 'support_en'];

const ASK: Record<string, { title: string; open: (s: Service) => string; how: string; answers: string }> = {
  signup_phone_auth: {
    title: '가입할 때 한국 휴대폰이 필요한가',
    open: (s) => (s.hints?.signup_url as string) || s.url,
    how: '가입 화면을 열고 **양식만 읽는다.** 계정을 만들지 않는다. 휴대폰 인증 화면이 나오면 **국가번호 칸에 +82 말고 다른 나라가 있는지** 꼭 본다.',
    answers: 'required(한국 번호만) · any_phone(해외 번호도 됨) · optional(이메일·애플 등 다른 길) · not_required(인증 자체가 없음) · 모름',
  },
  i18n_ui: {
    title: '어떤 언어로 쓸 수 있는가',
    open: (s) => s.url,
    how: '첫 화면에서 언어 전환(KO/EN·지구본·Language)을 찾아 **눌러서 실제로 바뀌는지** 본다. 브라우저 자동 번역은 세지 않는다.',
    answers: 'ko en 처럼 코드를 띄어쓰기로 나열 (ko 한국어 · en 영어 · ja 일본어 · zh 중국어 · vi 베트남어 · th 태국어 · id 인니어 · ru 러시아어 · mn 몽골어 · km 크메르어) · 모름',
  },
  support_en: {
    title: '영어로 문의할 수 있는가',
    open: (s) => (s.hints?.support_url as string) || s.url,
    how: '고객센터·FAQ 를 **실제로 열어** 영어 안내나 영어 문의 창구가 있는지 본다. 첫 화면에 언어 버튼이 없다는 것만으로 "없음"이라고 하지 않는다.',
    answers: 'yes(영어 있음) · no(열어봤고 한국어뿐) · 모름',
  },
};

function needs(service: Service, key: SignalKey): boolean {
  const sig = service.signals[key];
  return !sig || sig.confidence === 'unknown' || sig.value === null;
}

/** 코워크가 손대지 못한 것들 — 사람이 해야만 하는 무리 */
const BLOCKED = new Set([
  '11st', 'coupang', 'coupang-eats', 'naver', 'naver-booking', 'naver-shopping',
  'naver-map', 'naverpay', 'toss', 'ssg', 'ibk', 'kbank', 'kakaopay',
  'kakao-gift', 'kakao-map', 'kakao-t', 'kakaotalk', 'tving', 'ridibooks',
]);

async function main(): Promise<void> {
  const ids = await listServiceIds();
  const loaded = await Promise.all(ids.map((id) => loadService(id)));
  const services = loaded.filter((s): s is Service => s !== null);

  const rows = services
    .map((s) => ({ s, miss: CHECKABLE.filter((k) => needs(s, k)) }))
    .filter((r) => r.miss.length > 0)
    .sort(
      (a, b) =>
        // 코워크가 못 한 것 먼저 — 사람 말고는 길이 없는 것들이다
        Number(BLOCKED.has(b.s.id)) - Number(BLOCKED.has(a.s.id)) ||
        a.s.importance - b.s.importance ||
        b.miss.length - a.miss.length,
    );

  const total = rows.reduce((n, r) => n + r.miss.length, 0);
  const today = new Date().toISOString().slice(0, 10);

  const out: string[] = [];
  out.push('# 직접 확인할 목록');
  out.push('');
  out.push(`\`npm run byhand\` 가 만듦. **${rows.length}곳 · ${total}개 항목.**`);
  out.push('');
  out.push('## 하는 법');
  out.push('');
  out.push('1. **시크릿 창**(Ctrl+Shift+N)을 연다. 로그인된 계정이 하나도 없어야 한다.');
  out.push('   한국인 회원이 보는 화면과 외국인이 처음 보는 화면은 다르다.');
  out.push('2. 아래 항목마다 `열기:` 주소를 붙여넣고 본다.');
  out.push('3. **`답:` 과 `본 것:` 두 줄만 채운다.** 이 파일에 그대로 적으면 된다.');
  out.push('4. 다 하면(또는 하다 말고) 저장하고 Claude 에게 "byhand 반영해줘" 라고 한다.');
  out.push('');
  out.push('**모르면 `모름` 이라고 적으면 된다.** 그게 정답이다 — 빈칸은 나중에 채우면 되지만,');
  out.push('틀린 답은 그걸 믿은 사람을 공항에서 멈춰 세운다. 확실하지 않으면 `모름`.');
  out.push('');
  out.push('`본 것:` 에는 **화면에서 본 것을 그대로** 적는다. 판단이 아니라 관찰이다.');
  out.push('');
  out.push('| | |');
  out.push('|---|---|');
  out.push('| ❌ | `확인함` · `인증 필요함` |');
  out.push('| ⭕ | `통신사 선택(SKT/KT/LGU+)이 나오고 이메일 가입은 없었다` |');
  out.push('| ⭕ | `우측 위 EN 을 누르니 메뉴가 전부 영어로 바뀌었다` |');
  out.push('');
  out.push('한 줄이라도 적혀 있으면 기록되고, `본 것:` 이 비어 있으면 그 항목은 건너뛴다.');
  out.push('');

  for (const [key, meta] of Object.entries(ASK)) {
    out.push(`### \`${key}\` — ${meta.title}`);
    out.push('');
    out.push(`**보는 법** ${meta.how}`);
    out.push('');
    out.push(`**답에 쓸 것** ${meta.answers}`);
    out.push('');
  }

  out.push('---');
  out.push('');

  let n = 0;
  let inBlocked = true;
  out.push('## 코워크가 못 한 것 — 사람만 할 수 있음');
  out.push('');
  out.push('브라우저 확장이 막았거나(네이버·쿠팡·토스…) 이미 로그인돼 있어(카카오·TVING·리디)');
  out.push('신규 방문자 화면을 볼 수 없었던 곳이다. **여기가 제일 값지다** — 사람이 제일 많이 찾을 서비스들이다.');
  out.push('');

  for (const { s, miss } of rows) {
    if (inBlocked && !BLOCKED.has(s.id)) {
      inBlocked = false;
      out.push('---');
      out.push('');
      out.push('## 나머지');
      out.push('');
    }
    const label = s.name.ko && s.name.ko !== s.name.en ? `${s.name.en} · ${s.name.ko}` : s.name.en;
    out.push(`### ${label}   \`${s.id}\``);
    out.push('');
    for (const key of miss) {
      n += 1;
      out.push(`**${n}. ${ASK[key]!.title}**  \`${key}\``);
      out.push('');
      out.push(`열기: ${ASK[key]!.open(s)}`);
      out.push('');
      out.push('답:');
      out.push('본 것:');
      out.push('');
    }
  }

  out.push('---');
  out.push('');
  out.push(`확인한 날짜는 적지 않아도 된다 — 반영하는 날(${today} 같은)로 기록된다.`);

  const dest = path.join(ROOT, 'docs', '09-byhand.md');

  /*
   * **채우던 것을 덮어쓰지 않는다.**
   *
   * 이 파일은 운영자가 직접 손으로 채우는 것이라, 다시 만들면 그때까지 적은 것이
   * 통째로 사라진다. 2026-08-17 에 실제로 그랬다 — 주소 19건을 넣고 작업표를
   * 새로 만들었는데, 그 사이에 채우고 계시던 답이 전부 날아갔다.
   *
   * 한 줄이라도 채워져 있으면 멈춘다. 덮어쓰려면 --force 를 붙이거나,
   * 먼저 `npm run ingest-manual -- --file=docs/09-byhand.md` 로 채운 것을
   * 데이터에 넣고 나서 다시 만들면 된다 (그러면 채운 항목은 목록에서 빠진다).
   */
  const force = process.argv.includes('--force');
  if (!force) {
    try {
      const existing = await readFile(dest, 'utf8');
      const filled = existing.split(/\r?\n/).filter((l) => /^답:\s*\S/.test(l)).length;
      if (filled > 0) {
        console.error(`⚠️  ${dest}`);
        console.error(`   이미 ${filled}개 항목이 채워져 있다. 덮어쓰지 않았다.`);
        console.error('');
        console.error('   채운 것을 먼저 데이터에 넣으려면:');
        console.error('     npm run ingest-manual -- --file=docs/09-byhand.md');
        console.error('   넣고 나서 다시 만들면 채운 항목은 목록에서 빠진다.');
        console.error('');
        console.error('   그냥 새로 만들려면 (채운 것은 사라진다): npm run byhand -- --force');
        process.exitCode = 1;
        return;
      }
    } catch {
      /* 아직 없으면 그냥 만든다 */
    }
  }

  await writeFile(dest, `${out.join('\n')}\n`, 'utf8');

  const blocked = rows.filter((r) => BLOCKED.has(r.s.id)).length;
  console.log(`${rows.length}곳 · ${total}개 항목`);
  console.log(`  코워크가 못 한 것 ${blocked}곳 (맨 앞에 모아 뒀다)`);
  console.log(`  나머지 ${rows.length - blocked}곳`);
  console.log('');
  console.log(dest);
  console.log('');
  console.log('시크릿 창에서 열고 답:/본 것: 두 줄만 채우면 된다.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
