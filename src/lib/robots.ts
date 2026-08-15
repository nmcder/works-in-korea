/**
 * robots.txt 준수 장치.
 *
 * 규칙 (RFC 9309에 맞춤):
 *  - 우리 토큰(WorksInKoreaBot) 그룹이 있으면 그것만 본다. 없으면 `*` 그룹.
 *  - 경로 매칭은 가장 긴 규칙이 이긴다. 길이가 같으면 Allow가 이긴다.
 *  - robots.txt가 4xx면 전면 허용, 5xx/네트워크 실패면 전면 차단(보수적).
 *  - Crawl-delay가 있으면 HostThrottle에 반영한다.
 */
import { BOT_TOKEN } from '../config.js';

interface Rule {
  allow: boolean;
  pattern: string;
}

interface RobotsPolicy {
  /** true면 그룹이 없거나 4xx라 전면 허용 */
  allowAll: boolean;
  /** true면 5xx/네트워크 실패라 전면 차단 */
  denyAll: boolean;
  rules: Rule[];
  crawlDelaySec: number | null;
  source: string;
  status: number | null;
  /** robots.txt를 가져오지 못한 경우의 실제 오류 (진단용) */
  fetchError: string | null;
}

const cache = new Map<string, Promise<RobotsPolicy>>();

export interface RobotsCheck {
  allowed: boolean;
  reason: string;
  crawlDelayMs: number | null;
}

export function resetRobotsCache(): void {
  cache.clear();
}

export async function checkRobots(
  targetUrl: string,
  fetchText: (url: string) => Promise<{ status: number; text: string }>,
): Promise<RobotsCheck> {
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return { allowed: false, reason: 'invalid-url', crawlDelayMs: null };
  }

  const origin = parsed.origin;
  let pending = cache.get(origin);
  if (!pending) {
    pending = loadPolicy(origin, fetchText);
    cache.set(origin, pending);
  }
  const policy = await pending;

  const crawlDelayMs = policy.crawlDelaySec === null ? null : Math.round(policy.crawlDelaySec * 1000);

  if (policy.denyAll) {
    const detail = policy.fetchError ?? `status=${policy.status}`;
    return { allowed: false, reason: `robots-unavailable(${detail})`, crawlDelayMs };
  }
  if (policy.allowAll) return { allowed: true, reason: 'robots-allow-all', crawlDelayMs };

  const path = parsed.pathname + parsed.search;
  const match = bestMatch(policy.rules, path);
  if (!match) return { allowed: true, reason: 'robots-no-matching-rule', crawlDelayMs };
  return {
    allowed: match.allow,
    reason: `${match.allow ? 'Allow' : 'Disallow'}: ${match.pattern}`,
    crawlDelayMs,
  };
}

async function loadPolicy(
  origin: string,
  fetchText: (url: string) => Promise<{ status: number; text: string }>,
): Promise<RobotsPolicy> {
  const url = `${origin}/robots.txt`;
  let lastError: string | null = null;

  // 일시적 네트워크 오류 하나로 그 서비스의 하루치 측정이 통째로 날아가지 않도록 재시도한다.
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 2000));
    try {
      const { status, text } = await fetchText(url);
      if (status >= 400 && status < 500) {
        // RFC 9309: robots.txt가 없으면(4xx) 제한 없음으로 본다.
        return {
          allowAll: true, denyAll: false, rules: [], crawlDelaySec: null,
          source: url, status, fetchError: null,
        };
      }
      if (status >= 500) {
        lastError = `robots.txt 응답 ${status}`;
        continue;
      }
      return { ...parseRobots(text), source: url, status, fetchError: null };
    } catch (e) {
      lastError = e instanceof Error ? (e.cause as { code?: string } | undefined)?.code ?? e.message : String(e);
    }
  }

  // 끝내 확인하지 못하면 보수적으로 차단한다. 해당 서비스는 unknown으로 남고,
  // evidence에 실제 오류가 남으므로 시드 URL이 죽었는지 일시 장애인지 구분할 수 있다.
  return {
    allowAll: false, denyAll: true, rules: [], crawlDelaySec: null,
    source: url, status: null, fetchError: lastError,
  };
}

export function parseRobots(
  text: string,
): Omit<RobotsPolicy, 'source' | 'status' | 'fetchError'> {
  const lines = text.split(/\r?\n/);
  // 그룹: 연속된 User-agent 줄들 → 그 뒤의 규칙들
  const groups: { agents: string[]; rules: Rule[]; crawlDelaySec: number | null }[] = [];
  let current: { agents: string[]; rules: Rule[]; crawlDelaySec: number | null } | null = null;
  let expectingAgents = false;

  for (const raw of lines) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const field = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();

    if (field === 'user-agent') {
      if (!current || !expectingAgents) {
        current = { agents: [], rules: [], crawlDelaySec: null };
        groups.push(current);
        expectingAgents = true;
      }
      current.agents.push(value.toLowerCase());
      continue;
    }
    if (!current) continue;
    expectingAgents = false;

    if (field === 'allow' || field === 'disallow') {
      // `Disallow:` (빈 값) = 아무것도 막지 않음 → 규칙으로 넣지 않는다.
      if (value === '') continue;
      current.rules.push({ allow: field === 'allow', pattern: value });
    } else if (field === 'crawl-delay') {
      const n = Number(value);
      if (Number.isFinite(n) && n >= 0) current.crawlDelaySec = n;
    }
  }

  const exact = groups.filter((g) => g.agents.includes(BOT_TOKEN.toLowerCase()));
  const wildcard = groups.filter((g) => g.agents.includes('*'));
  const chosen = exact.length > 0 ? exact : wildcard;

  if (chosen.length === 0) {
    return { allowAll: true, denyAll: false, rules: [], crawlDelaySec: null };
  }

  const rules = chosen.flatMap((g) => g.rules);
  const delays = chosen.map((g) => g.crawlDelaySec).filter((d): d is number => d !== null);
  return {
    allowAll: rules.length === 0,
    denyAll: false,
    rules,
    crawlDelaySec: delays.length > 0 ? Math.max(...delays) : null,
  };
}

/** 가장 긴 매칭 규칙이 이긴다. 길이가 같으면 Allow 우선. */
function bestMatch(rules: readonly Rule[], path: string): Rule | null {
  let best: Rule | null = null;
  let bestLen = -1;
  for (const rule of rules) {
    if (!pathMatches(rule.pattern, path)) continue;
    const len = rule.pattern.length;
    if (len > bestLen || (len === bestLen && rule.allow && best && !best.allow)) {
      best = rule;
      bestLen = len;
    }
  }
  return best;
}

/** robots.txt 경로 패턴: `*`는 임의 문자열, 끝의 `$`는 문자열 끝 고정. */
export function pathMatches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith('$');
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const parts = body.split('*');

  let cursor = 0;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    if (part === '') {
      if (i === 0) continue;
      continue;
    }
    if (i === 0) {
      if (!path.startsWith(part)) return false;
      cursor = part.length;
      continue;
    }
    const found = path.indexOf(part, cursor);
    if (found < 0) return false;
    cursor = found + part.length;
  }

  if (anchored) {
    const tail = parts[parts.length - 1] ?? '';
    if (tail === '') return true; // `*$` 형태
    return path.endsWith(tail) && path.length >= cursor;
  }
  return true;
}
