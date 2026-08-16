/**
 * 손으로 확인할 것 목록을 뽑는다.  `npm run manual-queue`
 *
 * 왜 필요한가: 자동 측정이 닿지 못하는 칸이 크게 셋 있다.
 *
 *   가입 시 한국 휴대폰    16/106   가입 양식이 자바스크립트 뒤에 있거나 사이트가 막혀 있다
 *   쓸 수 있는 언어        70/106   위와 같은 이유
 *   영어 고객지원          19/106   고객센터 주소를 모르거나 못 연다
 *
 * 이 셋은 **사람이 열어 보면 5초면 안다.** robots.txt 는 크롤러를 막는 것이지
 * 사람을 막는 것이 아니므로, 자동 측정이 영구 불가인 36곳도 사람은 볼 수 있다.
 *
 * 반대로 사람이 못 하는 것도 분명히 있다. 운영자는 한국에 있으므로
 * `overseas_access` 는 확인할 수 없고(해외 시점이라야 한다), 해외 카드·해외 번호는
 * 실물이 있어야 하므로 제보 말고는 길이 없다. 그래서 이 목록에 그 셋은 넣지 않는다.
 *
 * 역할이 셋으로 갈린다:
 *   크론    해외 시점이라야 아는 것       overseas_access
 *   사람    눈으로 봐야 아는 것            signup_phone_auth · i18n_ui · support_en
 *   제보    실물이 있어야 아는 것          foreign_card · foreign_phone_sms
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listServiceIds, loadService } from './lib/store.js';
import type { Service, SignalKey } from './types.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/** 사람이 확인할 수 있는 것만. 나머지는 여기 넣으면 안 된다 (파일 첫머리 주석 참고). */
const CHECKABLE: SignalKey[] = ['signup_phone_auth', 'i18n_ui', 'support_en'];

const ASK: Record<string, { q: string; how: string; answers: string }> = {
  signup_phone_auth: {
    q: '가입할 때 한국 휴대폰 본인인증이 필요한가',
    how: '가입 페이지를 열고 **양식만 읽는다.** 계정을 만들지 않는다. 통신사 선택(SKT·KT·LG U+), "휴대폰 본인인증", "본인확인", PASS 앱, 아이핀 같은 것이 보이는지 본다.',
    answers:
      'required = 한국 번호(010) 인증 말고는 길이 없음 / any_phone = 인증은 하지만 국가번호를 +82 말고 다른 것도 고를 수 있음 / optional = 이메일·소셜 등 다른 길이 함께 있음 / not_required = 인증 요구가 아예 없음 / unknown = 확실하지 않음',
  },
  i18n_ui: {
    q: '어떤 언어로 쓸 수 있는가',
    how: '첫 화면에서 언어 전환 버튼(보통 우측 상단, KO/EN, 지구본 모양)을 찾는다. 눌러서 실제로 그 언어로 바뀌는지 본다. **자동 번역은 세지 않는다** — 사이트가 스스로 제공하는 것만.',
    answers: '["ko"] 또는 ["ko","en"] 처럼 실제로 고를 수 있는 언어 코드 배열 / 확실하지 않으면 null',
  },
  support_en: {
    q: '영어로 고객지원을 받을 수 있는가',
    how: '고객센터·FAQ·문의 페이지를 연다. 영어 안내나 영어 문의 창구가 있는지 본다.',
    answers:
      'yes = 영어 안내나 영어 문의 창구가 실제로 있음 / no = 한국어뿐임을 확인함 / unknown = 고객센터를 못 찾았거나 확실하지 않음',
  },
};

function needs(service: Service, key: SignalKey): boolean {
  const sig = service.signals[key];
  return !sig || sig.confidence === 'unknown' || sig.value === null;
}

async function main(): Promise<void> {
  /*
   * 기본은 **한 파일에 전부**다. 붙여넣기가 한 번이면 중간에 뭘 빠뜨릴 일이 없다.
   *
   * 나눠서 주고 싶으면 `--batch=12`. 나눌 이유가 하나 있긴 하다 — 2026-08-16 에
   * 63곳을 한 번에 돌렸더니 앞쪽은 근거를 길게 적었는데 뒤로 갈수록 짧아졌고,
   * 되돌려야 했던 8건 중 6건이 뒤쪽에 몰려 있었다. 길어지면 대충 해진다.
   * 그래도 기본값은 한 파일로 둔다 — 나누는 판단은 결과를 보고 사람이 하면 된다.
   */
  const rawBatch = process.argv.find((a) => a.startsWith('--batch='))?.split('=')[1];
  const batchSize = rawBatch ? Number(rawBatch) : Number.POSITIVE_INFINITY;

  const ids = await listServiceIds();
  const loaded = await Promise.all(ids.map((id) => loadService(id)));
  const services = loaded.filter((s): s is Service => s !== null);

  const rows = services
    .map((s) => ({ service: s, missing: CHECKABLE.filter((k) => needs(s, k)) }))
    .filter((r) => r.missing.length > 0)
    // 중요도 높은 것 먼저, 그다음 빈칸이 많은 것 먼저 — 한 번 열 때 많이 채우는 편이 싸다
    .sort((a, b) => a.service.importance - b.service.importance || b.missing.length - a.missing.length);

  const batches: (typeof rows)[] = [];
  for (let i = 0; i < rows.length; i += batchSize) batches.push(rows.slice(i, i + batchSize));
  const single = batches.length === 1;

  const out: string[] = [];
  out.push('# 손으로 확인할 것');
  out.push('');
  out.push(`\`npm run manual-queue\` 가 생성. 남은 ${rows.length}곳 · ${batches.length}묶음.`);
  out.push('');
  out.push('각 묶음을 `docs/08-manual-prompt.md` 의 프롬프트와 함께 코워크에 준다.');
  out.push('답을 받으면 `npm run ingest-manual -- --file=<답.json>` 으로 넣는다.');
  out.push('');

  for (const [k, v] of Object.entries(ASK)) {
    out.push(`## \`${k}\` — ${v.q}`);
    out.push('');
    out.push(`**보는 법** ${v.how}`);
    out.push('');
    out.push(`**답** ${v.answers}`);
    out.push('');
  }

  batches.forEach((batch, i) => {
    out.push('---');
    out.push('');
    out.push(`## 묶음 ${i + 1} / ${batches.length}`);
    out.push('');
    out.push('```json');
    out.push(
      JSON.stringify(
        batch.map((r) => ({
          service_id: r.service.id,
          name: r.service.name.en,
          url: r.service.url,
          ...(r.service.hints?.signup_url ? { signup_url: r.service.hints.signup_url } : {}),
          ...(r.service.hints?.support_url ? { support_url: r.service.hints.support_url } : {}),
          check: r.missing,
        })),
        null,
        2,
      ),
    );
    out.push('```');
    out.push('');
  });

  const dest = path.join(ROOT, 'docs', '07-manual-queue.md');
  await writeFile(dest, `${out.join('\n')}\n`, 'utf8');

  /*
   * 묶음마다 "그대로 복사해서 붙여넣으면 되는" 파일을 따로 만든다.
   *
   * 왜: 전에는 프롬프트 문서에서 본문을 잘라내고 목록 문서에서 묶음을 찾아 그 자리에
   * 끼워 넣어야 했다. 여섯 번을 더 해야 하는 일에서 조립 단계를 사람에게 맡기면
   * 언젠가 프롬프트 절반만 붙이거나 묶음을 두 개 붙인다. 파일 하나 = 붙여넣기 한 번.
   *
   * 프롬프트 본문은 08 에 한 벌만 두고 여기서 읽어다 쓴다. 두 벌이 되면 한쪽만
   * 고쳐지고, 실패 사례를 추가한 보람이 사라진다.
   */
  const promptDoc = await readFile(path.join(ROOT, 'docs', '08-manual-prompt.md'), 'utf8');
  const body = promptDoc.split('## 프롬프트 (여기서부터 복사)')[1]?.split('## 프롬프트 끝')[0];
  if (!body) {
    console.error('⚠️ 08-manual-prompt.md 에서 프롬프트 구간을 못 찾았다. 표시줄이 바뀌었는지 확인할 것.');
    return;
  }

  const outDir = path.join(ROOT, 'docs', 'queue');
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  const PLACEHOLDER = '(여기에 `docs/07-manual-queue.md` 의 묶음 JSON 을 붙여넣는다)';
  for (const [i, batch] of batches.entries()) {
    const json = JSON.stringify(
      batch.map((r) => ({
        service_id: r.service.id,
        name: r.service.name.en,
        url: r.service.url,
        ...(r.service.hints?.signup_url ? { signup_url: r.service.hints.signup_url } : {}),
        ...(r.service.hints?.support_url ? { support_url: r.service.hints.support_url } : {}),
        check: r.missing,
      })),
      null,
      2,
    );
    const filled = body.replace(PLACEHOLDER, `\`\`\`json\n${json}\n\`\`\``);
    await writeFile(
      path.join(outDir, single ? 'all.md' : `batch-${i + 1}.md`),
      `<!-- 이 파일 전체를 복사해서 코워크에 그대로 붙여넣으면 된다. 잘라낼 것 없음. -->\n<!-- npm run manual-queue 가 다시 만든다. 직접 고치지 말 것 — 프롬프트는 08 에 있다. -->\n${filled}`,
      'utf8',
    );
  }

  const counts = CHECKABLE.map((k) => `${k} ${rows.filter((r) => r.missing.includes(k)).length}건`);
  console.log(`남은 ${rows.length}곳 — ${counts.join(' · ')}`);
  console.log('');
  console.log('코워크에 줄 것 — 파일을 통째로 복사해서 붙여넣으면 된다:');
  if (single) {
    console.log(`  docs/queue/all.md   (${rows.length}곳 전부)`);
    console.log('');
    console.log('  나눠서 주려면: npm run manual-queue -- --batch=12');
  } else {
    for (const [i, b] of batches.entries()) {
      console.log(`  docs/queue/batch-${i + 1}.md   (${b.length}곳)`);
    }
  }
  console.log('');
  console.log(`사람이 훑어볼 전체 목록: ${dest}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
