/**
 * 운영자가 직접 확인할 목록을 만든다.  `npm run byhand`
 *
 * ── 왜 이렇게 다시 짰나
 *
 * 처음에는 "코워크가 못 한 것" 과 "나머지" 로 나눴다. 그때는 못 한 이유가 대개
 * 하나(브라우저 확장이 막음)였기 때문이다. 지금은 남은 것마다 **드는 품이 완전히
 * 다르다.** 시크릿 창에서 1분이면 끝나는 것과, 앱을 깔고 가입을 시작해야 하는 것과,
 * 윈도우 보안프로그램을 설치해야 하는 것을 한 줄에 섞어 놓으면 목록 전체가
 * 무겁게 느껴지고, 무거워 보이는 목록은 안 하게 된다.
 *
 * 그래서 **왜 사람이 필요한지**로 묶고, 묶음 머리에 그 묶음이 무엇을 요구하는지 적는다.
 * 싼 묶음만 하고 덮어도 그만큼 채워진다.
 *
 * ── 이유는 데이터에서 읽는다
 *
 * 손으로 목록을 관리하면 값이 채워져도 목록에 남고, 새로 막힌 곳은 안 들어온다.
 * hints 와 evidence 를 보고 그때그때 판단한다.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listServiceIds, loadService } from './lib/store.js';
import type { Service, SignalKey } from './types.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHECKABLE: SignalKey[] = ['signup_phone_auth', 'i18n_ui', 'support_en'];

interface Ask {
  title: string;
  open: (s: Service) => string;
  how: string;
  answers: string;
}

const ASK: Record<string, Ask> = {
  signup_phone_auth: {
    title: '가입할 때 한국 휴대폰이 필요한가',
    open: (s) => (s.hints?.signup_url as string) || s.url,
    how: '가입 화면을 열고 **양식만 읽는다.** 계정을 만들지 않는다. 휴대폰 인증 화면이 나오면 **국가번호 칸에 +82 말고 다른 나라가 있는지**, 통신사 목록에 한국 통신사만 있는지 꼭 본다.',
    answers:
      'required(한국 번호만) · any_phone(해외 번호도 됨) · optional(이메일·여권 등 다른 길) · not_required(인증 자체가 없음) · 모름',
  },
  i18n_ui: {
    title: '어떤 언어로 쓸 수 있는가',
    open: (s) => s.url,
    how: '첫 화면에서 언어 전환(KO/EN·지구본·Language)을 찾아 **눌러서 실제로 바뀌는지** 본다. 브라우저 자동 번역은 세지 않는다. 다른 회사의 별도 사이트로 나가는 링크도 세지 않는다.',
    answers:
      'ko en 처럼 코드를 띄어쓰기로 나열 (ko 한국어 · en 영어 · ja 일본어 · zh 중국어 · vi 베트남어 · th 태국어 · id 인니어 · ru 러시아어 · mn 몽골어 · km 크메르어) · 모름',
  },
  support_en: {
    title: '영어로 문의할 수 있는가',
    open: (s) => (s.hints?.support_url as string) || s.url,
    how: '고객센터·FAQ 를 **실제로 열어** 영어 안내나 영어 문의 창구가 있는지 본다. 첫 화면에 언어 버튼이 없다는 것만으로 "없음"이라고 하지 않는다.',
    answers: 'yes(영어 있음) · no(열어봤고 한국어뿐) · 모름',
  },
};

/** 왜 기계가 못 했는가. 배열 순서가 곧 목록 순서다 — 싼 것부터. */
const GROUPS = [
  {
    id: 'robots',
    title: '시크릿 창에서 열면 끝',
    cost: '한 곳에 1분',
    why:
      'robots.txt 가 **크롤러를** 막는 곳입니다. 우리는 그 약속을 지켜서 안 열지만, robots.txt 는 사람을 막는 규칙이 아닙니다. 브라우저로 그냥 열면 보입니다.\n\n여기가 제일 값집니다 — 사람이 가장 많이 찾는 서비스인데 우리 데이터에만 비어 있습니다.',
  },
  {
    id: 'unreachable',
    title: '한국에서는 열릴 수도 있음',
    cost: '한 곳에 1분',
    why:
      '해외에서 재면 서버가 아예 응답하지 않습니다(빈 응답·503). 운영자님은 한국에 계시니 **그냥 열릴 가능성이 높습니다.** 열리면 그 자체가 답입니다.',
  },
  {
    id: 'security',
    title: '윈도우 보안프로그램을 깔아야 함',
    cost: '귀찮음',
    why:
      '가입 양식이 보안프로그램(TouchEn nxKey 같은 .exe) 설치 뒤에 있습니다. 저는 실행파일을 설치하지 않습니다.\n\n**내키지 않으시면 건너뛰셔도 됩니다** — 맥이나 폰을 쓰는 외국인도 똑같이 못 지나가는 문이라, 비어 있는 것 자체가 어느 정도 사실을 말해 줍니다.',
  },
  {
    id: 'app',
    title: '앱을 깔고 가입을 시작해야 함',
    cost: '제일 무거움',
    why:
      '웹에는 가입 창구가 아예 없고 앱 안에만 있습니다.\n\n**끝까지 가입하실 필요는 없습니다.** 휴대폰 번호를 넣는 화면까지만 가서 **국가번호를 고를 수 있는지, 통신사 목록에 한국 통신사만 있는지**만 보시고 뒤로 나오시면 됩니다.',
  },
  {
    id: 'other',
    title: '그 밖에',
    cost: '',
    why: '위 어디에도 안 들어가는 것들입니다.',
  },
] as const;

type GroupId = (typeof GROUPS)[number]['id'];

/**
 * 사람이 직접 확인해서 알아낸 막힘 사유. **근거에는 안 적혀 있는 것들이다.**
 *
 * 크롤러가 남기는 근거는 자기가 본 것까지만 적는다. 예를 들어 티머니의 근거는
 * "가입 페이지를 찾지 못함" 인데, 실제 이유는 가입 화면이 윈도우 보안프로그램
 * 설치 안내 뒤에 있어서다 — 그건 사람이 브라우저로 열어 봐야 알 수 있다.
 *
 * 이 표는 **묶음(어느 칸에 넣을지)만 정한다.** 목록에 들어갈지 말지는 여전히
 * 데이터가 정하므로, 값이 채워지면 여기 남아 있어도 목록에서 저절로 사라진다.
 * 그래서 낡아도 해롭지 않다.
 */
const KNOWN: Record<string, GroupId> = {
  tmoney: 'security', // 가입 주소가 TouchEn nxKey 설치 안내로 넘어간다 (2026-08-17 확인)
  nonghyup: 'security', // 약관 동의 뒤 보안프로그램 로딩에서 멈춘다
  'naver-map': 'robots', // map.naver.com → /p 로 넘어가는데 그쪽이 Disallow: /
  'seoul-global': 'other', // 사이트에 회원가입 링크 자체가 없다 (서울시 통합회원 전환 중)
};

function whyHuman(service: Service, keys: SignalKey[]): GroupId {
  const known = KNOWN[service.id];
  if (known) return known;
  if (service.hints?.signup_app_only === true && keys.includes('signup_phone_auth')) return 'app';

  const blob = keys.map((k) => JSON.stringify(service.signals[k]?.evidence ?? {})).join(' ');
  if (/보안\s*프로그램|nxKey|TouchEn|Veraport/i.test(blob)) return 'security';
  /*
   * `robots-unavailable` 은 robots.txt 를 **못 가져왔다**는 뜻이다. 우리는 그때
   * 보수적으로 전면 차단하지만, 원인은 규칙이 아니라 서버가 응답하지 않는 것이다.
   * 사람에게는 완전히 다른 일이라 — 앞은 열면 보이고 뒤는 열어도 안 보인다 — 나눈다.
   */
  if (/robots-unavailable|ECONNREFUSED|ECONNRESET|EMPTY_RESPONSE|ETIMEDOUT|TIMEOUT/i.test(blob)) {
    return 'unreachable';
  }
  if (/Disallow|robots/i.test(blob)) return 'robots';
  return 'other';
}

function needs(service: Service, key: SignalKey): boolean {
  const sig = service.signals[key];
  return !sig || sig.confidence === 'unknown' || sig.value === null || sig.value === 'unknown';
}

async function main(): Promise<void> {
  const ids = await listServiceIds();
  const loaded = await Promise.all(ids.map((id) => loadService(id)));
  const services = loaded.filter((s): s is Service => s !== null);

  const rows = services
    .map((s) => ({ s, miss: CHECKABLE.filter((k) => needs(s, k)) }))
    .filter((r) => r.miss.length > 0)
    .map((r) => ({ ...r, group: whyHuman(r.s, r.miss) }))
    .sort((a, b) => a.s.importance - b.s.importance || b.miss.length - a.miss.length);

  const total = rows.reduce((n, r) => n + r.miss.length, 0);
  const today = new Date().toISOString().slice(0, 10);

  const out: string[] = [];
  out.push('# 직접 확인할 목록');
  out.push('');
  out.push(`\`npm run byhand\` 가 만듦. **${rows.length}곳 · ${total}개 항목.**`);
  out.push('');
  out.push('기계가 닿지 못한 것만 남았습니다. **묶음마다 드는 품이 다릅니다** — 위에서부터 싼 것이고,');
  out.push('맨 아래 묶음은 앱을 깔아야 합니다. 한 묶음만 하고 덮으셔도 그만큼 채워집니다.');
  out.push('');
  out.push('## 하는 법');
  out.push('');
  out.push('1. **시크릿 창**(Ctrl+Shift+N)을 연다. 로그인된 계정이 하나도 없어야 한다.');
  out.push('   한국인 회원이 보는 화면과 외국인이 처음 보는 화면은 다르다.');
  out.push('2. 항목마다 `열기:` 주소를 붙여넣고 본다.');
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
  out.push('| ⭕ | `통신사 선택(SKT/KT/LGU+)만 있고 국가번호 칸은 없었다` |');
  out.push('| ⭕ | `우측 위 EN 을 누르니 메뉴가 전부 영어로 바뀌었다` |');
  out.push('');

  for (const [key, meta] of Object.entries(ASK)) {
    out.push(`### \`${key}\` — ${meta.title}`);
    out.push('');
    out.push(`**보는 법** ${meta.how}`);
    out.push('');
    out.push(`**답에 쓸 것** ${meta.answers}`);
    out.push('');
  }

  let n = 0;
  for (const g of GROUPS) {
    const mine = rows.filter((r) => r.group === g.id);
    if (mine.length === 0) continue;
    const count = mine.reduce((a, r) => a + r.miss.length, 0);
    out.push('---');
    out.push('');
    out.push(`## ${g.title}${g.cost ? ` — ${g.cost}` : ''}`);
    out.push('');
    out.push(`**${mine.length}곳 · ${count}개 항목.**`);
    out.push('');
    out.push(g.why);
    out.push('');

    for (const { s, miss } of mine) {
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
  }

  out.push('---');
  out.push('');
  out.push(`확인한 날짜는 적지 않아도 된다 — 반영하는 날(${today} 같은)로 기록된다.`);

  const dest = path.join(ROOT, 'docs', '09-byhand.md');

  /*
   * 채우던 것을 덮어쓰지 않는다. 2026-08-17 에 실제로 한 번 날렸다.
   * 한 줄이라도 채워져 있으면 멈춘다.
   */
  if (!process.argv.includes('--force')) {
    try {
      const existing = await readFile(dest, 'utf8');
      const filled = existing.split(/\r?\n/).filter((l) => /^답:\s*\S/.test(l)).length;
      if (filled > 0) {
        console.error(`⚠️  ${dest}`);
        console.error(`   이미 ${filled}개 항목이 채워져 있다. 덮어쓰지 않았다.`);
        console.error('   먼저 넣으려면: npm run ingest-manual -- --file=docs/09-byhand.md');
        console.error('   그냥 새로 만들려면: npm run byhand -- --force');
        process.exitCode = 1;
        return;
      }
    } catch {
      /* 아직 없으면 그냥 만든다 */
    }
  }

  await writeFile(dest, `${out.join('\n')}\n`, 'utf8');

  console.log(`${rows.length}곳 · ${total}개 항목`);
  for (const g of GROUPS) {
    const mine = rows.filter((r) => r.group === g.id);
    if (mine.length > 0) {
      console.log(`  ${g.title}: ${mine.length}곳 · ${mine.reduce((a, r) => a + r.miss.length, 0)}개`);
    }
  }
  console.log('');
  console.log(dest);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
