/**
 * 어떤 서비스에 아이콘 파일이 있는지 빌드 시점에 한 번만 센다.
 *
 * 왜 목록을 미리 만드는가: 없는 그림을 <img> 로 걸면 브라우저가 요청했다가 404 를
 * 받고 깨진 아이콘을 그린다. 화면에 X 표가 뜨는 것보다 처음부터 글자 타일을
 * 그리는 편이 낫다. 파일이 있는지는 빌드할 때 이미 알 수 있는 사실이다.
 *
 * 아이콘은 `npm run icons` 가 받아서 커밋한다 (scripts/fetch-icons.mjs 주석 참고).
 */
import { readdir } from 'node:fs/promises';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'public', 'icon');

let cache: Promise<Set<string>> | null = null;

export function getIconIds(): Promise<Set<string>> {
  cache ??= (async () => {
    try {
      const files = await readdir(DIR);
      return new Set(files.filter((f) => f.endsWith('.jpg')).map((f) => f.slice(0, -4)));
    } catch {
      // 아이콘을 아직 한 번도 안 받았어도 사이트는 그대로 빌드돼야 한다.
      return new Set<string>();
    }
  })();
  return cache;
}

export async function hasIcon(id: string): Promise<boolean> {
  return (await getIconIds()).has(id);
}

/*
 * 글자 타일(아이콘이 없을 때 그리는 것)은 components/AppIcon.tsx 에 있다.
 * 이 파일은 node:fs 를 쓰므로 클라이언트 번들에 들어가면 빌드가 깨진다 —
 * 목록 화면(Explorer)은 클라이언트 컴포넌트다. 여기에는 서버 전용만 둔다.
 */
