/**
 * 공유 미리보기 이미지 — 서비스 한 곳.
 *
 * 커뮤니티에 "쿠팡은 이렇다"고 링크를 걸면 답이 그림에 이미 보인다.
 * 링크를 누르기 전에 정보가 전달되는 것이 손해처럼 보이지만 반대다 —
 * 답이 보이는 링크가 훨씬 많이 눌리고 훨씬 많이 공유된다.
 *
 * ⚠️ 한글을 넣지 않는다 (app/opengraph-image.tsx 주석 참고).
 * 서비스의 한국어 이름도 여기서는 쓰지 않는다.
 */
import { ImageResponse } from 'next/og';
import { getService, getServices } from '@/lib/data';
import { CATEGORY_LABELS, HEADLINE_KEYS, viewSignal } from '@/lib/present';

export const alt = 'Does this Korean service work for foreigners?';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export async function generateStaticParams(): Promise<{ id: string }[]> {
  const services = await getServices();
  return services.map((s) => ({ id: s.id }));
}

/*
 * ⚠️ 상태 표시를 글자(✓ ✕)로 하면 안 된다. satori 는 기본 글꼴에 없는 글자를 만나면
 * 구글 폰트에서 받아오려 하는데, 빌드 환경에서 그 요청이 실패하면 **두부(□)로 그려진다.**
 * 실패해도 빌드는 통과하므로 눈으로 열어 보기 전에는 모른다. 실제로 그렇게 나왔다.
 * 선으로 직접 그리면 글꼴이 아예 필요 없다.
 */
const TONE: Record<string, { fg: string; bg: string; path: string }> = {
  open: { fg: '#0a6a3f', bg: '#e8f5ed', path: 'M3 8.5 6.5 12 13 4.5' },
  barrier: { fg: '#a33113', bg: '#fbeee8', path: 'M4 4l8 8M12 4l-8 8' },
  mixed: { fg: '#82550a', bg: '#f9f2e2', path: 'M3.5 8h9' },
  info: { fg: '#454138', bg: '#f0ede6', path: 'M8 6.5v3' },
  none: { fg: '#6e695f', bg: '#f1efe9', path: 'M8 4.5v5' },
};

const LABEL: Record<string, string> = {
  overseas_access: 'From abroad',
  i18n_ui: 'Languages',
  signup_phone_auth: 'Sign-up',
};

/*
 * ⚠️ params 는 Promise 다. await 를 빼먹으면 params.id 가 undefined 가 되고
 * getService(undefined) 가 null 을 돌려줘서 **빈 그림이 조용히 만들어진다.**
 * 빌드는 통과하고 파일도 생기므로(3KB짜리 흰 이미지) 눈으로 열어 보기 전에는 모른다.
 * 실제로 그렇게 106장을 만들어 놓고 성공한 줄 알았다.
 */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = await getService(id);
  if (!service) return new ImageResponse(<div />, size);

  const rows = HEADLINE_KEYS.map((k) => viewSignal(service, k)).map((v) => ({
    key: v.key,
    label: LABEL[v.key] ?? v.label.en,
    value: v.display.en,
    tone: TONE[v.tone] ?? TONE.none!,
  }));
  const cat = CATEGORY_LABELS[service.category]?.en ?? service.category;

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
          padding: '64px 72px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 24, color: '#67635b', marginBottom: 14 }}>{cat}</div>
          <div
            style={{
              fontSize: 68,
              fontWeight: 700,
              color: '#14130f',
              letterSpacing: -2.5,
              lineHeight: 1.05,
              maxWidth: 1040,
            }}
          >
            {service.name.en}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 44 }}>
            {rows.map((r) => (
              <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <div style={{ display: 'flex', width: 210, fontSize: 27, color: '#67635b' }}>
                  {r.label}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    background: r.tone.bg,
                    color: r.tone.fg,
                    fontSize: 29,
                    fontWeight: 600,
                    padding: '10px 22px',
                    borderRadius: 12,
                  }}
                >
                  <svg width="26" height="26" viewBox="0 0 16 16" fill="none">
                    <path
                      d={r.tone.path}
                      stroke={r.tone.fg}
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div style={{ display: 'flex' }}>{r.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 25,
            color: '#67635b',
          }}
        >
          <div style={{ display: 'flex', color: '#1d4ed8', fontWeight: 700 }}>Works in Korea?</div>
          <div style={{ display: 'flex' }}>worksinkorea.com</div>
        </div>
      </div>
    ),
    size,
  );
}
