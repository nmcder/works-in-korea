/**
 * 공유 미리보기 이미지 — 사이트 전체.
 *
 * Reddit·카톡·슬랙에 링크를 붙였을 때 뜨는 그림이다. 없으면 회색 상자만 나오고,
 * 커뮤니티에 올릴 때 클릭률이 눈에 띄게 갈린다.
 *
 * ⚠️ 한글을 넣지 않는다. 이 이미지는 satori 가 그리는데, 글꼴 데이터를 직접
 * 넘기지 않으면 라틴 문자만 그려지고 한글은 네모로 나온다. 한글 웹폰트는 수 MB라
 * 미리보기 그림 하나 때문에 빌드에 얹을 값어치가 없다. 영어만 쓴다.
 */
import { ImageResponse } from 'next/og';
import { getBlockedServices, getServices } from '@/lib/data';

export const alt = 'Works in Korea? — do Korean online services work for foreigners?';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const [services, blocked] = await Promise.all([getServices(), getBlockedServices()]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#f8f7f4',
          padding: '72px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: '#1d4ed8',
              letterSpacing: -0.5,
              marginBottom: 28,
            }}
          >
            Works in Korea?
          </div>
          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              color: '#14130f',
              letterSpacing: -3,
              lineHeight: 1.08,
              maxWidth: 900,
            }}
          >
            Will this Korean site work for you?
          </div>
          <div style={{ fontSize: 30, color: '#4a463e', marginTop: 28, maxWidth: 860 }}>
            Checked every day from outside Korea. Does it open, what languages, and does signing
            up need a Korean phone number.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 40, fontSize: 26 }}>
          <Stat n={String(services.length)} label="services" />
          <Dot />
          <Stat n={String(blocked.length)} label="block automated checks" />
          <Dot />
          <div style={{ display: 'flex', color: '#67635b' }}>worksinkorea.com</div>
        </div>
      </div>
    ),
    size,
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
      <div style={{ fontWeight: 700, color: '#14130f' }}>{n}</div>
      <div style={{ color: '#67635b' }}>{label}</div>
    </div>
  );
}

function Dot() {
  return (
    <div
      style={{ display: 'flex', width: 6, height: 6, borderRadius: 3, background: '#d9d4c8' }}
    />
  );
}
