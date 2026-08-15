const START = Date.now();

function stamp(): string {
  const s = ((Date.now() - START) / 1000).toFixed(1).padStart(6, ' ');
  return `[${s}s]`;
}

export const log = {
  info(msg: string, ...rest: unknown[]): void {
    console.log(`${stamp()} ${msg}`, ...rest);
  },
  warn(msg: string, ...rest: unknown[]): void {
    console.warn(`${stamp()} WARN ${msg}`, ...rest);
  },
  error(msg: string, ...rest: unknown[]): void {
    console.error(`${stamp()} ERROR ${msg}`, ...rest);
  },
  /** GitHub Actions 로그에서 접히는 그룹 */
  group(title: string): void {
    if (process.env.GITHUB_ACTIONS) console.log(`::group::${title}`);
    else console.log(`\n=== ${title} ===`);
  },
  groupEnd(): void {
    if (process.env.GITHUB_ACTIONS) console.log('::endgroup::');
  },
};

export function errMessage(e: unknown): string {
  if (e instanceof Error) return `${e.name}: ${e.message}`;
  return String(e);
}
