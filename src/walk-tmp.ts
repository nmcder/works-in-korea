/** 버리는 도구. 페이지를 렌더링해 인증·언어·지원 단서를 훑는다. */
import { closeBrowser, snapshotPage } from './lib/browser.js';
import { extractLinks } from './lib/http.js';

const NEEDLES = [
  '본인인증','본인확인','휴대폰','휴대전화','통신사','SKT','PASS','아이핀','i-PIN',
  '주민등록번호','외국인등록','여권','passport','이메일','국가번호','간편인증',
  '공동인증서','금융인증서','English','ENG','언어','Language','外国','中文','日本語',
  'foreign','global','내국인',
];

for (const url of process.argv.slice(2)) {
  console.log(`\n${'='.repeat(70)}\n${url}`);
  const p = await snapshotPage(url);
  if (!p.ok || !p.html) { console.log('  열지 못함:', p.blockedReason ?? p.error); continue; }
  const text = (p.visibleText ?? '').replace(/\s+/g, ' ');
  console.log('  최종:', p.finalUrl ?? url, `· ${text.length}자`);
  console.log('  앞부분:', text.slice(0, 260));
  const hits = NEEDLES.filter((n) => text.toLowerCase().includes(n.toLowerCase()));
  for (const n of hits.slice(0, 8)) {
    const i = text.toLowerCase().indexOf(n.toLowerCase());
    console.log(`   [${n}] …${text.slice(Math.max(0, i - 60), i + 90)}…`);
  }
  const links = extractLinks(p.html, url)
    .filter((l) => /join|regist|member|signup|lang|en\/|eng|help|faq|support|가입|언어|고객/i.test(l.href + l.text))
    .slice(0, 12);
  for (const l of links) console.log(`    → ${l.text.trim().slice(0, 30).padEnd(30)} ${l.href}`);
}
await closeBrowser();
