/**
 * 예의 바른 HTTP 계층.
 * 이 파일 밖에서 전역 fetch를 직접 호출하지 말 것 — 여기가 robots/rate-limit을 강제하는 지점이다.
 */
import { createHash } from 'node:crypto';
import { HOST_DELAY_OVERRIDES, LIMITS, ROBOTS_EXEMPT_PREFIXES, USER_AGENT } from '../config.js';
import { HostThrottle, Semaphore, sleep } from './limiter.js';
import { checkRobots } from './robots.js';

const globalSemaphore = new Semaphore(LIMITS.globalConcurrency);
const throttle = new HostThrottle(LIMITS.perHostDelayMs, HOST_DELAY_OVERRIDES);

export interface FetchOptions {
  headers?: Record<string, string>;
  method?: 'GET' | 'HEAD';
  timeoutMs?: number;
  /** true면 robots.txt를 확인하지 않는다. ROBOTS_EXEMPT_PREFIXES에 해당할 때만 내부적으로 쓴다. */
  skipRobots?: boolean;
  /** 본문을 읽지 않고 상태만 확인 */
  discardBody?: boolean;
}

export interface FetchOutcome {
  ok: boolean;
  /** robots.txt가 막았거나 네트워크 오류로 요청 자체를 못 한 경우 */
  blockedReason: string | null;
  status: number | null;
  finalUrl: string | null;
  redirected: boolean;
  headers: Record<string, string>;
  body: string | null;
  bodySha256: string | null;
  bytes: number;
  elapsedMs: number;
  error: string | null;
}

function isRobotsExempt(url: string): boolean {
  return ROBOTS_EXEMPT_PREFIXES.some((prefix) => url.startsWith(prefix));
}

/** robots.txt 자체를 가져오는 저수준 요청 (robots 검사 대상 아님) */
async function fetchRobotsText(url: string): Promise<{ status: number; text: string }> {
  const host = new URL(url).host;
  return globalSemaphore.run(() =>
    throttle.run(host, async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), LIMITS.requestTimeoutMs);
      try {
        const res = await fetch(url, {
          headers: { 'user-agent': USER_AGENT, accept: 'text/plain,*/*' },
          redirect: 'follow',
          signal: controller.signal,
        });
        const text = res.status === 200 ? (await res.text()).slice(0, 512_000) : '';
        return { status: res.status, text };
      } finally {
        clearTimeout(timer);
      }
    }),
  );
}

export async function politeFetch(url: string, options: FetchOptions = {}): Promise<FetchOutcome> {
  const started = Date.now();
  const empty: FetchOutcome = {
    ok: false,
    blockedReason: null,
    status: null,
    finalUrl: null,
    redirected: false,
    headers: {},
    body: null,
    bodySha256: null,
    bytes: 0,
    elapsedMs: 0,
    error: null,
  };

  let host: string;
  try {
    host = new URL(url).host;
  } catch {
    return { ...empty, blockedReason: 'invalid-url', elapsedMs: Date.now() - started };
  }

  const exempt = options.skipRobots === true || isRobotsExempt(url);
  if (!exempt) {
    const verdict = await checkRobots(url, fetchRobotsText);
    if (verdict.crawlDelayMs !== null) throttle.setHostDelay(host, verdict.crawlDelayMs);
    if (!verdict.allowed) {
      return {
        ...empty,
        blockedReason: `robots: ${verdict.reason}`,
        elapsedMs: Date.now() - started,
      };
    }
  }

  const attempts = LIMITS.retries + 1;
  let last: FetchOutcome = { ...empty };

  for (let attempt = 0; attempt < attempts; attempt++) {
    if (attempt > 0) await sleep(1500 * attempt);
    last = await globalSemaphore.run(() =>
      throttle.run(host, () => rawFetch(url, options, started)),
    );
    const retryable = last.error !== null || (last.status !== null && last.status >= 500);
    if (!retryable) break;
  }
  return last;
}

async function rawFetch(url: string, options: FetchOptions, started: number): Promise<FetchOutcome> {
  const controller = new AbortController();
  const timeout = options.timeoutMs ?? LIMITS.requestTimeoutMs;
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        'user-agent': USER_AGENT,
        accept: 'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
        ...options.headers,
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    const headers: Record<string, string> = {};
    for (const [k, v] of res.headers) {
      if (['content-type', 'content-language', 'server', 'cf-ray', 'location', 'set-cookie'].includes(k)) {
        headers[k] = k === 'set-cookie' ? '<present>' : v;
      }
    }

    let body: string | null = null;
    let bytes = 0;
    if (!options.discardBody && options.method !== 'HEAD') {
      const buf = await readCapped(res, LIMITS.maxBodyBytes);
      bytes = buf.byteLength;
      body = new TextDecoder('utf-8', { fatal: false }).decode(buf);
    } else {
      await res.body?.cancel();
    }

    return {
      ok: res.status >= 200 && res.status < 400,
      blockedReason: null,
      status: res.status,
      finalUrl: res.url || url,
      redirected: normalizeUrl(res.url || url) !== normalizeUrl(url),
      headers,
      body,
      bodySha256: body === null ? null : sha256(normalizeBody(body)),
      bytes,
      elapsedMs: Date.now() - started,
      error: null,
    };
  } catch (e) {
    const message = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    return {
      ok: false,
      blockedReason: null,
      status: null,
      finalUrl: null,
      redirected: false,
      headers: {},
      body: null,
      bodySha256: null,
      bytes: 0,
      elapsedMs: Date.now() - started,
      error: message,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function readCapped(res: Response, maxBytes: number): Promise<Uint8Array> {
  if (!res.body) return new Uint8Array(0);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    chunks.push(value);
    total += value.byteLength;
    if (total >= maxBytes) {
      await reader.cancel();
      break;
    }
  }
  const out = new Uint8Array(Math.min(total, maxBytes));
  let offset = 0;
  for (const chunk of chunks) {
    const room = out.byteLength - offset;
    if (room <= 0) break;
    out.set(chunk.subarray(0, room), offset);
    offset += Math.min(chunk.byteLength, room);
  }
  return out;
}

export function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * 본문 해시 비교용 정규화. 매 요청 달라지는 토큰(CSRF, nonce, 타임스탬프)을 지워서
 * "내용이 실제로 달라졌는가"만 비교되도록 한다.
 */
export function normalizeBody(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/\b[0-9a-f]{16,}\b/gi, '<hex>')
    .replace(/\b\d{10,13}\b/g, '<ts>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 400_000);
}

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    const path = u.pathname.replace(/\/+$/, '') || '/';
    return `${u.protocol}//${u.host}${path}${u.search}`;
  } catch {
    return url;
  }
}

/** HTML에서 태그를 지우고 사람이 읽는 텍스트만 남긴다 (LLM 입력·휴리스틱용) */
export function visibleText(html: string, maxChars = 20000): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxChars);
}

/** 문서 안의 <a href> 를 절대 URL로 뽑아낸다. */
export function extractLinks(html: string, baseUrl: string): { href: string; text: string }[] {
  const out: { href: string; text: string }[] = [];
  const re = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const raw = m[1]!;
    if (/^(javascript:|mailto:|tel:|#)/i.test(raw)) continue;
    try {
      out.push({ href: new URL(raw, baseUrl).toString(), text: visibleText(m[2] ?? '', 120) });
    } catch {
      /* 상대경로 파싱 실패는 무시 */
    }
    if (out.length >= 800) break;
  }
  return out;
}

/** <script src> / <iframe src> 목록 — PG·본인인증 위젯 탐지에 쓴다. */
export function extractAssetUrls(html: string): string[] {
  const out: string[] = [];
  const re = /<(?:script|iframe)\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    out.push(m[1]!);
    if (out.length >= 400) break;
  }
  return out;
}
