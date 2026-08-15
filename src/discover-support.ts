/**
 * 고객지원 페이지 후보 발굴 도구.
 *
 * 추측으로 주소를 만들지 않는다. 서비스 홈페이지에서 실제로 걸려 있는 링크만 뽑아
 * 살아 있는지 확인한 뒤 후보로 제시한다. 운영자/개발자는 그중 맞는 것만 시드에 넣는다.
 *
 *   npm run discover -- coupang toss        (특정 서비스만)
 *   npm run discover -- --importance=1      (우선순위 1등급 전체)
 */
import { extractLinks, politeFetch, visibleText } from './lib/http.js';
import { mapWithConcurrency } from './lib/limiter.js';
import { errMessage, log } from './lib/log.js';
import { listServiceIds, loadService } from './lib/store.js';

/** 링크 텍스트/주소에 이게 들어 있으면 고객지원 후보로 본다 */
const SUPPORT_HINTS = [
  '고객센터',
  '고객지원',
  '고객만족',
  '문의',
  '상담',
  '도움말',
  '자주 묻는',
  'faq',
  'help',
  'support',
  'contact',
  'customer',
  'inquiry',
  'service-center',
  'servicecenter',
];

/** 후보에서 빼야 하는 것 (오탐이 잦음) */
const EXCLUDE = ['helper', 'supporters', 'contactless', 'faqja', 'helpdesk-login'];

/** 쿠키 배너가 거는 브라우저 안내 문서 등 — 이 서비스의 고객지원이 아니다 */
const THIRD_PARTY_NOISE = [
  'support.microsoft.com',
  'support.google.com',
  'support.apple.com',
  'support.mozilla.org',
  'help.opera.com',
];

/** 등록 가능 도메인(마지막 두 라벨)이 같은가 */
function sameDomain(a: string, b: string): boolean {
  try {
    const reg = (u: string): string => new URL(u).hostname.split('.').slice(-2).join('.');
    return reg(a) === reg(b);
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const impArg = args.find((a) => a.startsWith('--importance='));
  const explicit = args.filter((a) => !a.startsWith('--'));

  let ids = await listServiceIds();
  if (explicit.length > 0) {
    ids = ids.filter((id) => explicit.includes(id));
  } else if (impArg) {
    const want = Number(impArg.slice('--importance='.length));
    const filtered: string[] = [];
    for (const id of ids) {
      const s = await loadService(id);
      if (s && s.importance === want && !s.hints?.support_url) filtered.push(id);
    }
    ids = filtered;
  }

  log.info(`${ids.length}개 서비스에서 고객지원 링크 발굴`);

  await mapWithConcurrency(ids, 5, async (id) => {
    const service = await loadService(id);
    if (!service) return;

    // 동시 실행 중 출력이 섞이면 어느 후보가 어느 서비스 것인지 알 수 없어진다.
    // 서비스별로 모아 두었다가 마지막에 한 번에 찍는다.
    const out: string[] = [];
    const say = (line: string): void => void out.push(line);
    try {
      const home = await politeFetch(service.url, {
        headers: { 'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8' },
      });
      if (home.blockedReason || home.error !== null || !home.body) {
        say(`\n### ${id} (${service.name.ko})`);
        say(`  홈페이지 접근 불가: ${home.blockedReason ?? home.error ?? `status=${home.status}`}`);
        return;
      }

      const links = extractLinks(home.body, home.finalUrl ?? service.url);
      const candidates = [
        ...new Set(
          links
            .filter((l) => {
              const hay = `${l.href} ${l.text}`.toLowerCase();
              if (EXCLUDE.some((x) => hay.includes(x))) return false;
              return SUPPORT_HINTS.some((h) => hay.includes(h.toLowerCase()));
            })
            .map((l) => l.href),
        ),
      ]
        // 쿠키 안내(마이크로소프트·구글·애플 지원 문서) 같은 명백한 노이즈 제거
        .filter((u) => !THIRD_PARTY_NOISE.some((d) => u.includes(d)))
        // 같은 도메인 후보를 먼저 보여준다
        .sort((a, b) => Number(sameDomain(b, service.url)) - Number(sameDomain(a, service.url)))
        .slice(0, 5);

      say(`\n### ${id} (${service.name.ko})`);
      if (candidates.length === 0) {
        say('  홈페이지에 고객지원 링크가 안 보임');
        return;
      }

      for (const url of candidates) {
        const res = await politeFetch(url, {
          headers: { 'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8' },
        });
        const status = res.status ?? 0;
        const alive = status >= 200 && status < 400;
        const title = res.body ? (/<title[^>]*>([\s\S]{0,120}?)<\/title>/i.exec(res.body)?.[1] ?? '').trim() : '';
        const bodyText = res.body === null ? '' : visibleText(res.body, 6000).toLowerCase();
        const hasSupportText = SUPPORT_HINTS.some((h) => bodyText.includes(h.toLowerCase()));
        const mark = res.blockedReason ? 'BLOCKED' : alive ? (hasSupportText ? '후보' : '살아있음') : '실패';
        const external = sameDomain(url, service.url) ? '' : ' [다른 도메인]';
        say(`  [${mark}]${external} ${url}`);
        say(
          `         status=${status}${title ? ` title="${title.replace(/\s+/g, ' ')}"` : ''}${res.blockedReason ? ` (${res.blockedReason})` : ''}`,
        );
      }
    } catch (e) {
      say(`\n### ${id}: 실패 — ${errMessage(e)}`);
    } finally {
      // 서비스 단위로 한 번에 출력해야 후보와 서비스의 대응이 깨지지 않는다
      if (out.length > 0) console.log(out.join('\n'));
    }
  });
}

main().catch((e: unknown) => {
  log.error(String(e));
  process.exitCode = 1;
});
