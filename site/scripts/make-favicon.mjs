/**
 * 파비콘을 그린다.  `npm run favicon`
 *
 * ── 왜 필요한가
 *
 * 구글 검색 결과에서 주소 왼쪽에 뜨는 작은 그림이다. 없으면 지구본 모양 기본
 * 아이콘이 나오는데, 결과 목록에서 우리만 이름 없는 사이트처럼 보인다.
 * 2026-08-17 확인 시점에 이 사이트에는 `<link rel="icon">` 도, /favicon.ico 도
 * 아예 없었다 (넷 다 404).
 *
 * ── 왜 그림 파일을 만들어 두는가 (SVG 하나로 안 끝내고)
 *
 * 16px 에서 읽히는 것과 512px 에서 읽히는 것은 다른 문제다. 그리고 브라우저는
 * 아직도 아무 말 없이 /favicon.ico 를 먼저 찾는다. 그래서 세 벌을 만든다.
 *   favicon.ico    32·48px 두 장을 담은 통 — 브라우저 탭과 구글
 *   icon.png       512px — 고해상도 화면, 안드로이드 홈 화면
 *   apple-icon.png 180px — 아이폰 홈 화면 (여기만 모서리를 안 깎는다, iOS 가 깎는다)
 *
 * ── 무엇을 그리는가
 *
 * 파란 사각형에 흰 물음표. 머리말의 "Works in Korea?" 에서 물음표만 파란색인데
 * (globals.css 의 `.brand span`), 그 물음표가 이 사이트의 표식이다.
 * 16px 로 줄었을 때 남는 것은 글자 하나뿐이므로 그 하나를 표식으로 쓴다.
 *
 * 글꼴은 머리말과 같은 시스템 산세리프다. 세리프 물음표는 16px 에서 가는 획이
 * 사라져 얼룩처럼 보인다.
 *
 * ── 고칠 때
 *
 * 색이나 글자를 바꾸려면 아래 상수만 고치고 다시 돌린다. 만들어진 파일은
 * app/ 에 들어가고 Next 가 알아서 <link> 를 붙인다.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.join(HERE, '..', 'app');

const BG = '#1d4ed8'; // globals.css --accent
const FG = '#ffffff';
const GLYPH = '?';

/** 캔버스 대비 비율. 눈으로 맞춘 값이라 글자를 바꾸면 다시 맞춰야 한다. */
const RADIUS = 0.22; // AppIcon.tsx 의 앱 아이콘 곡률과 같게
const FONT = 0.78;
const NUDGE_Y = -0.035; // 물음표는 아래가 비어 있어 그냥 가운데 두면 처져 보인다

function page(size, { rounded }) {
  return `<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;background:transparent}
    .t{
      width:${size}px;height:${size}px;
      display:flex;align-items:center;justify-content:center;
      background:${BG};
      border-radius:${rounded ? Math.round(size * RADIUS) : 0}px;
      color:${FG};
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;
      font-weight:800;
      font-size:${Math.round(size * FONT)}px;
      line-height:1;
      letter-spacing:-0.02em;
    }
    .g{transform:translateY(${(size * NUDGE_Y).toFixed(2)}px)}
  </style><div class="t"><span class="g">${GLYPH}</span></div>`;
}

async function draw(browser, size, opts = {}) {
  const p = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await p.setContent(page(size, { rounded: opts.rounded ?? true }));
  const buf = await p.screenshot({ omitBackground: true, type: 'png' });
  await p.close();
  return buf;
}

/**
 * PNG 여러 장을 .ico 한 통에 담는다.
 *
 * ICO 는 원래 자체 비트맵 형식이지만 Windows Vista 이후로 PNG 를 그대로 품을 수
 * 있다. 요즘 브라우저는 전부 이 방식을 읽으므로 굳이 비트맵으로 변환하지 않는다.
 * 헤더 6바이트 + 그림마다 16바이트 목차 + PNG 본문 순서다.
 */
function ico(images) {
  const head = Buffer.alloc(6);
  head.writeUInt16LE(0, 0); // 예약
  head.writeUInt16LE(1, 2); // 1 = 아이콘
  head.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const dir = [];
  for (const { size, buf } of images) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0); // 256 은 0 으로 적는 규칙
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2); // 팔레트 없음
    e.writeUInt8(0, 3); // 예약
    e.writeUInt16LE(1, 4); // 색면 수
    e.writeUInt16LE(32, 6); // 픽셀당 비트
    e.writeUInt32LE(buf.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += buf.length;
    dir.push(e);
  }
  return Buffer.concat([head, ...dir, ...images.map((i) => i.buf)]);
}

const browser = await chromium.launch();
try {
  await mkdir(APP, { recursive: true });

  const [i32, i48, i512, iApple] = await Promise.all([
    draw(browser, 32),
    draw(browser, 48),
    draw(browser, 512),
    // iOS 는 자기가 모서리를 깎는다. 우리가 미리 깎으면 두 번 깎여 알약이 된다.
    draw(browser, 180, { rounded: false }),
  ]);

  await writeFile(path.join(APP, 'favicon.ico'), ico([{ size: 32, buf: i32 }, { size: 48, buf: i48 }]));
  await writeFile(path.join(APP, 'icon.png'), i512);
  await writeFile(path.join(APP, 'apple-icon.png'), iApple);

  console.log('app/favicon.ico     32 + 48px');
  console.log('app/icon.png        512px');
  console.log('app/apple-icon.png  180px (모서리 안 깎음 — iOS 가 깎는다)');
  console.log('');
  console.log('Next 가 <link rel="icon"> 을 알아서 붙인다. npm run build 로 확인할 것.');
} finally {
  await browser.close();
}
