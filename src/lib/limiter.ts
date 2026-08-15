/**
 * 동시 실행 제한 + 호스트별 최소 간격.
 * 크롤링 예의(저빈도)를 코드 레벨에서 강제하기 위한 장치라 우회 경로를 만들지 말 것.
 */

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 전역 동시 실행 세마포어 */
export class Semaphore {
  #available: number;
  #queue: (() => void)[] = [];

  constructor(limit: number) {
    this.#available = Math.max(1, limit);
  }

  async acquire(): Promise<() => void> {
    if (this.#available > 0) {
      this.#available -= 1;
    } else {
      await new Promise<void>((resolve) => this.#queue.push(resolve));
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const next = this.#queue.shift();
      if (next) next();
      else this.#available += 1;
    };
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

/**
 * 호스트별 직렬화 + 최소 간격.
 * 같은 호스트로 가는 요청은 한 번에 하나씩, 그리고 최소 delayMs 간격으로만 나간다.
 */
export class HostThrottle {
  #chains = new Map<string, Promise<void>>();
  #lastAt = new Map<string, number>();
  #extraDelay = new Map<string, number>();

  constructor(
    private readonly defaultDelayMs: number,
    /** 기본 간격 대신 쓸 호스트별 값. robots.txt의 Crawl-delay가 더 크면 그쪽이 이긴다. */
    private readonly overrides: Readonly<Record<string, number>> = {},
  ) {}

  /** robots.txt의 Crawl-delay를 반영한다 (기존 값보다 클 때만). */
  setHostDelay(host: string, delayMs: number): void {
    const current = this.#extraDelay.get(host) ?? 0;
    if (delayMs > current) this.#extraDelay.set(host, delayMs);
  }

  delayFor(host: string): number {
    const base = this.overrides[host] ?? this.defaultDelayMs;
    return Math.max(base, this.#extraDelay.get(host) ?? 0);
  }

  async run<T>(host: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.#chains.get(host) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    this.#chains.set(
      host,
      prev.then(() => gate),
    );

    await prev;
    try {
      const last = this.#lastAt.get(host);
      if (last !== undefined) {
        const wait = this.delayFor(host) - (Date.now() - last);
        if (wait > 0) await sleep(wait);
      }
      return await fn();
    } finally {
      this.#lastAt.set(host, Date.now());
      release();
    }
  }
}

/** 배열을 동시 실행 상한을 지키며 처리한다. 개별 실패는 null로 수렴시키지 않고 그대로 던진다. */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(Math.max(1, limit), items.length) }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await fn(items[index]!, index);
    }
  });
  await Promise.all(workers);
  return results;
}
