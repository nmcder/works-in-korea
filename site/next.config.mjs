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
};

export default nextConfig;
