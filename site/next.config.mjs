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

  // 서버 0대 원칙(CLAUDE.md 4장). 빌드 결과가 순수 정적 파일이라
  // Vercel Hobby·GitHub Pages·S3 어디에 올려도 동작하고 런타임 비용이 0이다.
  output: 'export',
  images: { unoptimized: true },
  // 정적 호스팅에서 /service/coupang 같은 주소가 새로고침에도 열리도록 디렉터리 형태로 뽑는다.
  trailingSlash: true,
};

export default nextConfig;
