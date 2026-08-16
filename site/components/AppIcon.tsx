/**
 * 서비스 이름 앞에 붙는 앱 아이콘.
 *
 * 사람은 이름보다 그림을 먼저 알아본다. 106줄짜리 목록에서 "Olive Young Global" 을
 * 읽어 찾는 것과 올리브영 아이콘을 알아보는 것은 걸리는 시간이 다르다.
 *
 * 아이콘이 없는 곳(앱이 아예 없는 8곳)은 깨진 그림 대신 글자 타일을 그린다.
 * 빈 자리를 남기면 줄이 어긋나서 목록 전체가 흔들린다.
 *
 * ⚠️ next/image 를 쓰지 않는다. 이미 128px 로 받아 둔 파일이고 최적화할 것이 없는데,
 * 정적 배포에서 next/image 는 unoptimized 여도 srcset 계산과 런타임을 얹는다.
 */
/**
 * 아이콘이 없을 때 쓰는 글자 타일의 색.
 *
 * id 를 숫자로 접어서 고른다 — 무작위가 아니라 항상 같은 서비스에 같은 색이 나와야
 * 다시 왔을 때 눈이 기억한다. 색은 뜻을 담지 않는다 (장벽 표시는 점이 따로 한다).
 */
const TILES = [
  { bg: '#eef2fd', fg: '#2c4a9a' },
  { bg: '#eaf4ee', fg: '#2a6446' },
  { bg: '#fbeeea', fg: '#8f3b21' },
  { bg: '#f7f0e2', fg: '#7a5a1c' },
  { bg: '#f1eef7', fg: '#54407f' },
  { bg: '#e9f2f5', fg: '#2a5c6b' },
];

function tileFor(id: string, name: string): { bg: string; fg: string; letter: string } {
  let n = 0;
  for (let i = 0; i < id.length; i += 1) n = (n * 31 + id.charCodeAt(i)) >>> 0;
  const t = TILES[n % TILES.length]!;
  return { ...t, letter: (name.trim()[0] ?? '?').toUpperCase() };
}

export function AppIcon({
  id,
  name,
  has,
  size = 40,
}: {
  id: string;
  name: string;
  has: boolean;
  size?: number;
}) {
  if (has) {
    return (
      <img
        className="appicon"
        src={`/icon/${id}.jpg`}
        alt=""
        aria-hidden
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        style={{ width: size, height: size }}
      />
    );
  }

  const t = tileFor(id, name);
  return (
    <span
      className="appicon tile"
      aria-hidden
      style={{
        width: size,
        height: size,
        background: t.bg,
        color: t.fg,
        fontSize: Math.round(size * 0.44),
      }}
    >
      {t.letter}
    </span>
  );
}
