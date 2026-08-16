import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 레포 루트에도 package-lock.json(측정 엔진)이 있어서, 지정하지 않으면
  // Next가 워크스페이스 루트를 레포 루트로 잘못 잡는다.
  turbopack: { root: HERE },

  // Next가 site/ 안에 CLAUDE.md·AGENTS.md 를 자동 생성한다.
  // 이 레포의 인수인계 문서는 루트 CLAUDE.md 하나뿐이어야 하므로 끈다.
  agentRules: false,

  // 정적 내보내기(output:'export')를 껐다. 제보 접수 창구(/api/report) 때문이다.
  //
  // 왜: 전에는 GitHub 이슈 폼으로만 제보를 받았고, 그러려면 제보자가 GitHub 계정을
  // 만들어 로그인해야 했다. 여행 중인 외국인에게 그 문턱은 벽이고, 제보가 유일한
  // 데이터원인 40개 서비스가 그 벽 뒤에서 영원히 비어 있게 된다.
  //
  // 잃은 것: '어디에나 올릴 수 있는 순수 파일'이라는 성질. 실제로 옮길 계획은 없었다.
  // 지킨 것: 비용 0원과 운영 부담 0 — 원칙의 진짜 목적. 페이지는 여전히 전부 빌드
  // 시점에 미리 그려져 CDN 에서 나가고, 함수가 도는 것은 제보 한 건당 한 번뿐이다.
  // 공개 JSON API(public/api/)도 그대로 정적 파일이다.
  images: { unoptimized: true },
  // 정적 호스팅에서 /service/coupang 같은 주소가 새로고침에도 열리도록 디렉터리 형태로 뽑는다.
  trailingSlash: true,

  /*
   * 공유 미리보기 그림에 **.png 로 끝나는 주소**를 하나 더 달아 준다.
   *
   * 왜: Next 가 만드는 주소는 `/opengraph-image/` 라서 파일이 아니라 폴더처럼 보인다.
   * 카카오톡 수집기는 확장자로 이미지를 가려내는 것으로 알려져 있어서, 그림이 200 으로
   * 멀쩡히 나오는데도 미리보기를 비워 둔다. 트위터·슬랙처럼 잘 되는 곳이 있어서
   * "그림이 없다"가 아니라 "저쪽이 안 알아본다"를 의심해야 하는 종류의 문제다.
   *
   * redirect 가 아니라 rewrite 인 것이 핵심이다 — 주소는 그대로 두고 내용만 가져온다.
   * 리다이렉트로 하면 수집기가 따라오지 않아서 지금과 똑같은 문제가 된다.
   */
  async rewrites() {
    return [
      { source: '/og/site.png', destination: '/opengraph-image' },
      { source: '/og/s/:id/image.png', destination: '/service/:id/opengraph-image' },
    ];
  },
};

export default nextConfig;
