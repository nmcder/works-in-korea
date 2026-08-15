/**
 * 힌트 발굴 — 값이 비는 가장 큰 원인을 지운다.
 *
 * 2026-08-15 기준으로 signup_phone_auth 는 106건 중 97건이, app_availability 는 85건이
 * 비어 있었다. 그중 절반 이상은 사이트가 거부해서가 아니라 **가입 주소와 앱 ID를
 * 몰라서** 비어 있었다. 그건 우리 쪽 공백이므로 우리가 메운다.
 *
 * 추측으로 채우지 않는다 (CLAUDE.md 절대규칙 5). 후보를 만든 다음 **실제로 열어 보고**,
 * 확인된 것만 verified 로 표시한다. --apply 는 verified 만 시드에 쓴다.
 *
 *   가입 주소   홈페이지에 걸린 링크만 따라간다. 연 페이지에 가입 표시와 입력란이
 *               둘 다 있어야 verified. 로그인 화면이거나 안내문이면 후보로만 남긴다.
 *   앱 ID       android_package 가 있으면 iTunes 에 그 bundleId 로 조회한다 (정확 일치).
 *               없으면 이름으로 검색하되, bundleId 가 서비스 도메인을 뒤집은 모양일 때만
 *               인정한다. 예: korail.com ↔ com.korail.talk
 *   고객지원     열리고 지원 관련 문구가 있으면 verified. 판정은 support_en 프로브가 한다.
 *
 * 사용법
 *   npm run find-hints                      전체 탐색, 후보 파일만 갱신
 *   npm run find-hints -- --only=coupang,toss
 *   npm run find-hints -- --kind=app        signup | support | app
 *   npm run find-hints -- --apply           verified 만 시드에 기록
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PATHS } from './config.js';
import { closeBrowser, snapshotPage } from './lib/browser.js';
import { extractLinks, politeFetch, visibleText } from './lib/http.js';
import { mapWithConcurrency } from './lib/limiter.js';
import { errMessage, log } from './lib/log.js';
import { countFormInputs, detectPageKind } from './lib/page-kind.js';
import { listServiceIds, loadService, writeJson } from './lib/store.js';
import type { SeedService, Service } from './types.js';

type Kind = 'signup' | 'support' | 'app';
type Verdict = 'verified' | 'weak' | 'rejected';

interface Candidate {
  /** 시드에 들어갈 값 */
  value: string;
  verdict: Verdict;
  /** 왜 그렇게 판정했는지 — 사람이 읽고 뒤집을 수 있어야 한다 */
  why: string;
}

interface Found {
  id: string;
  name: string;
  signup_url?: Candidate[];
  support_url?: Candidate[];
  ios_app_id?: Candidate[];
  android_package?: Candidate[];
  /** 탐색 자체가 불가능했던 경우 */
  blocked?: string;
}

const CANDIDATES_FILE = path.join(PATHS.root, 'data', 'hint-candidates.json');
const REPORT_FILE = path.join(PATHS.root, 'docs', '06-hint-candidates.md');

/** 링크 텍스트나 주소에 이게 있으면 가입 후보로 본다 */
const SIGNUP_HINTS = [
  '회원가입',
  '회원 가입',
  '가입하기',
  '신규가입',
  '회원등록',
  '/join',
  '/signup',
  '/sign-up',
  '/register',
  '/member/join',
  '/membership',
  'sign up',
  'signup',
  'create account',
];

/** 가입과 무관한데 위 낱말이 걸리는 것들 */
const SIGNUP_EXCLUDE = [
  'joinus',
  'join-us',
  'recruit',
  'career',
  'newsletter',
  '뉴스레터',
  '제휴',
  '입점',
  'partner',
  'seller',
  'business',
  'corp',
  '기업회원',
  '판매자',
];

const SUPPORT_HINTS = [
  '고객센터',
  '고객지원',
  '문의',
  '도움말',
  '자주 묻는',
  'faq',
  'help',
  'support',
  'customer',
];

const SUPPORT_EXCLUDE = ['helper', 'supporters', 'contactless', 'helpdesk-login'];

/** 쿠키 배너가 거는 브라우저 안내 문서 등 */
const THIRD_PARTY_NOISE = [
  'support.microsoft.com',
  'support.google.com',
  'support.apple.com',
  'support.mozilla.org',
  'help.opera.com',
];

/**
 * 도메인 뒤 두 라벨이 실제 소유자가 아닌 경우.
 *
 * 한국 도메인은 대부분 cgv.co.kr 처럼 2단계라, 뒤 두 라벨만 보면 전부 `co.kr` 이 된다.
 * 그 상태로 같은 도메인인지 따지면 한국 사이트끼리는 전부 같은 회사가 되어버린다.
 * 실제로 이 실수로 CGV 에 롯데시네마 앱이 붙었다.
 */
const MULTI_LABEL_SUFFIX = new Set([
  'co.kr',
  'or.kr',
  'go.kr',
  'ne.kr',
  're.kr',
  'pe.kr',
  'ac.kr',
  'hs.kr',
  'ms.kr',
  'es.kr',
  'sc.kr',
  'kg.kr',
  'co.jp',
  'com.au',
  'co.uk',
]);

/** 소유자를 가리키는 도메인. cgv.co.kr, korail.com */
function registrable(url: string): string | null {
  try {
    const parts = new URL(url).hostname.replace(/^www\./, '').split('.');
    const last2 = parts.slice(-2).join('.');
    return MULTI_LABEL_SUFFIX.has(last2) ? parts.slice(-3).join('.') : last2;
  } catch {
    return null;
  }
}

function sameDomain(a: string, b: string): boolean {
  const ra = registrable(a);
  return ra !== null && ra === registrable(b);
}

/** 홈페이지는 한 번만 받아서 세 탐색이 나눠 쓴다. 같은 사이트를 세 번 두드리지 않는다. */
interface Home {
  html: string;
  finalUrl: string;
}

async function fetchHome(service: Service): Promise<Home> {
  const res = await politeFetch(service.url, {
    headers: { 'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8' },
  });
  if (res.blockedReason !== null || res.error !== null || !res.body) {
    throw new Error(res.blockedReason ?? res.error ?? `홈페이지 status=${res.status}`);
  }
  return { html: res.body, finalUrl: res.finalUrl ?? service.url };
}

// ── 가입 주소 ────────────────────────────────────────────────────────────────

function signupLinksIn(html: string, baseUrl: string, siteUrl: string): string[] {
  return [
    ...new Set(
      extractLinks(html, baseUrl)
        .filter((l) => {
          const hay = `${l.href} ${l.text}`.toLowerCase();
          if (SIGNUP_EXCLUDE.some((x) => hay.includes(x))) return false;
          return SIGNUP_HINTS.some((h) => hay.includes(h.toLowerCase()));
        })
        .map((l) => l.href),
    ),
  ].filter((u) => sameDomain(u, siteUrl));
}

async function findSignup(service: Service, home: Home): Promise<Candidate[]> {
  let urls = signupLinksIn(home.html, home.finalUrl, service.url);

  // 토스·당근·컬리처럼 메뉴를 자바스크립트로 그리는 사이트는 원본 HTML에 가입 링크가 없다.
  // 원본에서 못 찾으면 브라우저로 한 번 더 그려서 본다. 106곳 중 40곳이 이 경우였다.
  if (urls.length === 0) {
    const rendered = await snapshotPage(service.url);
    if (rendered.ok && rendered.html) {
      urls = signupLinksIn(rendered.html, rendered.finalUrl ?? service.url, service.url);
    }
  }

  // 그래도 없으면 로그인 화면을 본다. 한국 사이트는 가입 버튼이 로그인 화면에만 있는 경우가 흔하다.
  if (urls.length === 0) {
    const loginLink = extractLinks(home.html, home.finalUrl).find((l) => {
      const hay = `${l.href} ${l.text}`.toLowerCase();
      return /\/login|\/signin|\/sign-in|로그인/.test(hay) && sameDomain(l.href, service.url);
    });
    if (loginLink) {
      const page = await snapshotPage(loginLink.href);
      if (page.ok && page.html) {
        urls = signupLinksIn(page.html, page.finalUrl ?? loginLink.href, service.url);
      }
    }
  }

  urls = urls.slice(0, 4);

  const out: Candidate[] = [];
  for (const url of urls) {
    // politeFetch 로 먼저 두드리면 죽은 링크에 브라우저를 띄우지 않는다
    const head = await politeFetch(url, { discardBody: true });
    if (head.blockedReason !== null) {
      out.push({ value: url, verdict: 'rejected', why: `차단 — ${head.blockedReason}` });
      continue;
    }
    if (head.status === null || head.status >= 400) {
      out.push({ value: url, verdict: 'rejected', why: `status=${head.status ?? 'no-response'}` });
      continue;
    }

    const page = await snapshotPage(url);
    if (!page.ok || !page.html) {
      out.push({
        value: url,
        verdict: 'rejected',
        why: `열지 못함 — ${page.blockedReason ?? page.error ?? '알 수 없음'}`,
      });
      continue;
    }

    const kind = detectPageKind(page.html, page.visibleText ?? '');
    const inputs = countFormInputs(page.html);

    // 프로브가 값을 내는 조건과 똑같이 본다. 여기서 통과한 주소만 실제로 측정된다.
    if (kind.usableForSignup && inputs >= 2) {
      out.push({
        value: page.finalUrl ?? url,
        verdict: 'verified',
        why: `가입 양식 확인 — page_kind=${kind.kind}, 입력란 ${inputs}개`,
      });
    } else if (kind.usableForSignup) {
      out.push({
        value: page.finalUrl ?? url,
        verdict: 'weak',
        why: `가입 표시는 있으나 입력란 ${inputs}개 — 안내 페이지로 보임`,
      });
    } else {
      out.push({
        value: page.finalUrl ?? url,
        verdict: 'rejected',
        why: `가입 표시 없음 — page_kind=${kind.kind}`,
      });
    }
  }

  return out;
}

// ── 고객지원 주소 ────────────────────────────────────────────────────────────

async function findSupport(service: Service, home: Home): Promise<Candidate[]> {
  const links = extractLinks(home.html, home.finalUrl);
  const urls = [
    ...new Set(
      links
        .filter((l) => {
          const hay = `${l.href} ${l.text}`.toLowerCase();
          if (SUPPORT_EXCLUDE.some((x) => hay.includes(x))) return false;
          return SUPPORT_HINTS.some((h) => hay.includes(h.toLowerCase()));
        })
        .map((l) => l.href),
    ),
  ]
    .filter((u) => !THIRD_PARTY_NOISE.some((d) => u.includes(d)))
    .sort((a, b) => Number(sameDomain(b, service.url)) - Number(sameDomain(a, service.url)))
    .slice(0, 3);

  const out: Candidate[] = [];
  for (const url of urls) {
    const res = await politeFetch(url, {
      headers: { 'accept-language': 'ko-KR,ko;q=0.9,en;q=0.8' },
    });
    if (res.blockedReason !== null || res.error !== null || res.status === null || res.status >= 400) {
      out.push({
        value: url,
        verdict: 'rejected',
        why: res.blockedReason ?? res.error ?? `status=${res.status ?? 'no-response'}`,
      });
      continue;
    }
    const text = res.body === null ? '' : visibleText(res.body, 8000).toLowerCase();
    const hit = SUPPORT_HINTS.filter((h) => text.includes(h.toLowerCase()));
    out.push(
      hit.length > 0
        ? { value: res.finalUrl ?? url, verdict: 'verified', why: `지원 문구 확인 — ${hit.slice(0, 3).join(', ')}` }
        : { value: res.finalUrl ?? url, verdict: 'weak', why: '열리지만 지원 문구가 안 보임' },
    );
  }
  return out;
}

// ── 앱 ID ────────────────────────────────────────────────────────────────────

interface ITunesApp {
  trackId?: number;
  trackName?: string;
  bundleId?: string;
  sellerName?: string;
  /** 개발사가 애플에 등록한 홈페이지 주소 */
  sellerUrl?: string;
}

async function itunes(endpoint: string): Promise<ITunesApp[]> {
  const res = await politeFetch(endpoint, { timeoutMs: 12000 });
  if (res.blockedReason !== null || res.error !== null || !res.body) return [];
  try {
    const data = JSON.parse(res.body) as { results?: ITunesApp[] };
    return data.results ?? [];
  } catch {
    return [];
  }
}

async function playListed(pkg: string): Promise<boolean | null> {
  const res = await politeFetch(
    `https://play.google.com/store/apps/details?id=${encodeURIComponent(pkg)}&hl=en`,
    { discardBody: true, timeoutMs: 12000 },
  );
  if (res.blockedReason !== null || res.error !== null || res.status === null) return null;
  if (res.status >= 200 && res.status < 300) return true;
  if (res.status === 404) return false;
  return null;
}

/**
 * 앱 ID 찾기. 쓸 수 있는 경로는 둘뿐이고, 둘 다 추측이 아니다.
 *
 *   1. 사이트가 자기 홈페이지에서 스토어 링크를 건 경우
 *      서비스 본인이 "이게 우리 앱"이라고 밝힌 것이므로 이보다 확실한 근거가 없다.
 *   2. 이미 아는 안드로이드 패키지로 iTunes 를 조회
 *      bundleId 정확 일치라 다른 앱이 나올 수 없다.
 *
 * ⚠️ 이름 검색(`itunes.apple.com/search`)은 쓰지 않는다. **애플 robots.txt 가 금지한다.**
 *
 *     Disallow: /search*        ← 검색 금지
 *     Disallow: /*<i></i>/lookup?    ← /us/lookup? 같은 형태만 금지. 루트 /lookup? 은 허용
 *
 * politeFetch 가 이미 이것을 막는다. 우회 코드를 넣지 말 것 (CLAUDE.md 절대규칙 4).
 * 검색이 가능했더라도 자동 적용은 못 했다 — 네이버로 검색하면 지도·페이·예약이 전부
 * 같은 개발사로 나와서 어느 앱인지 고를 수 없기 때문이다.
 *
 * 결과적으로 자동 접근이 막힌 서비스는 앱 ID도 사람이 넣어야 한다.
 */
async function findApps(
  service: Service,
  homeHtml: string | null,
): Promise<{ ios: Candidate[]; android: Candidate[] }> {
  const ios: Candidate[] = [];
  const android: Candidate[] = [];
  const haveIos = Boolean(service.hints?.ios_app_id);
  const haveAndroid = Boolean(service.hints?.android_package);
  if (haveIos && haveAndroid) return { ios, android };

  // 1) 홈페이지에 걸린 스토어 링크
  if (homeHtml) {
    if (!haveIos) {
      const m = /apps\.apple\.com\/[^"'\s]*?\/id(\d{6,12})/i.exec(homeHtml);
      if (m) {
        ios.push({
          value: m[1]!,
          verdict: 'verified',
          why: `홈페이지가 App Store 를 직접 링크 — id${m[1]}`,
        });
      }
    }
    if (!haveAndroid) {
      const m = /play\.google\.com\/store\/apps\/details\?[^"'\s]*?id=([A-Za-z0-9_.]{4,80})/i.exec(
        homeHtml,
      );
      if (m) {
        android.push({
          value: m[1]!,
          verdict: 'verified',
          why: `홈페이지가 Google Play 를 직접 링크 — ${m[1]}`,
        });
      }
    }
  }

  // 2) 아는 안드로이드 패키지로 iTunes 조회 (정확 일치)
  const pkg = service.hints?.android_package ?? android.find((c) => c.verdict === 'verified')?.value;
  if (!haveIos && ios.length === 0 && pkg) {
    const hit = (
      await itunes(`https://itunes.apple.com/lookup?bundleId=${encodeURIComponent(pkg)}&country=kr`)
    )[0];
    if (hit?.trackId) {
      ios.push({
        value: String(hit.trackId),
        verdict: 'verified',
        why: `bundleId ${pkg} 정확 일치 — "${hit.trackName ?? '?'}" (${hit.sellerName ?? '?'})`,
      });
    }
  }

  // Play 에 실제로 있는지까지 확인해야 값이 사실이 된다
  for (const c of android) {
    if (c.verdict !== 'verified') continue;
    const listed = await playListed(c.value);
    if (listed === false) {
      c.verdict = 'rejected';
      c.why = `${c.why} — 그러나 Play 에서 404`;
    }
  }

  return { ios, android };
}

// ── 실행 ─────────────────────────────────────────────────────────────────────

/** 사이트가 자동 접근을 막고 있으면 사이트 대상 탐색은 건너뛴다. 앱 조회는 애플·구글 상대라 계속한다. */
function siteBlocked(service: Service): string | null {
  const sig = service.signals.overseas_access;
  if (!sig || sig.confidence !== 'unknown') return null;
  const raw = JSON.stringify(sig.evidence ?? {});
  if (/robots-unavailable/.test(raw)) return '해외에서 robots.txt 를 읽지 못함';
  if (/robots:\s*Disallow/i.test(raw)) return 'robots.txt 가 크롤러를 금지';
  if (/"http_status":\s*(403|429)/.test(raw)) return '사이트가 크롤러를 거부 (403/429)';
  return null;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const onlyArg = args.find((a) => a.startsWith('--only='));
  const kindArg = args.find((a) => a.startsWith('--kind='));
  const only = onlyArg ? onlyArg.slice('--only='.length).split(',').map((s) => s.trim()) : null;
  const kinds: Kind[] = kindArg
    ? (kindArg.slice('--kind='.length).split(',') as Kind[])
    : ['signup', 'support', 'app'];

  let ids = await listServiceIds();
  if (only) ids = ids.filter((id) => only.includes(id));

  log.info(`${ids.length}개 서비스 · 대상 ${kinds.join(', ')}${apply ? ' · --apply' : ''}`);

  const found: Found[] = [];

  await mapWithConcurrency(ids, 4, async (id) => {
    const service = await loadService(id);
    if (!service) return;

    const entry: Found = { id, name: service.name.ko };
    const blocked = siteBlocked(service);
    if (blocked) entry.blocked = blocked;

    // 사이트 자체를 못 여는 경우에도 앱 조회는 계속한다 — 애플·구글에 묻는 것이라
    // 그 사이트의 차단과 무관하다. 막힌 서비스도 최소한 앱 정보는 얻는다.
    let home: Home | null = null;
    if (!blocked) {
      home = await fetchHome(service).catch((e: unknown) => {
        entry.blocked = errMessage(e);
        return null;
      });
    }

    try {
      if (kinds.includes('signup') && !service.hints?.signup_url && home) {
        const c = await findSignup(service, home).catch(() => [] as Candidate[]);
        if (c.length > 0) entry.signup_url = c;
      }
      if (kinds.includes('support') && !service.hints?.support_url && home) {
        const c = await findSupport(service, home).catch(() => [] as Candidate[]);
        if (c.length > 0) entry.support_url = c;
      }
      if (kinds.includes('app')) {
        const { ios, android } = await findApps(service, home?.html ?? null);
        if (ios.length > 0) entry.ios_app_id = ios;
        if (android.length > 0) entry.android_package = android;
      }
    } catch (e) {
      entry.blocked = errMessage(e);
    }

    const hasAny =
      entry.signup_url ?? entry.support_url ?? entry.ios_app_id ?? entry.android_package;
    if (hasAny || entry.blocked) found.push(entry);

    const verified = [
      entry.signup_url,
      entry.support_url,
      entry.ios_app_id,
      entry.android_package,
    ].reduce((n, list) => n + (list?.filter((c) => c.verdict === 'verified').length ?? 0), 0);
    log.info(`  ${id}: 확인 ${verified}건${entry.blocked ? ` (${entry.blocked})` : ''}`);
  });

  await closeBrowser();

  // --kind 로 한 종류만 돌렸다면 이번에 안 본 항목의 이전 후보를 살려 둔다.
  // 그러지 않으면 운영자가 검토하려던 목록이 조용히 지워진다.
  const FIELDS: (keyof Found)[] = ['signup_url', 'support_url', 'ios_app_id', 'android_package'];
  const kept: (keyof Found)[] = FIELDS.filter(
    (f) =>
      !(kinds.includes('signup') && f === 'signup_url') &&
      !(kinds.includes('support') && f === 'support_url') &&
      !(kinds.includes('app') && (f === 'ios_app_id' || f === 'android_package')),
  );
  if (kept.length > 0) {
    const prev = await readFile(CANDIDATES_FILE, 'utf8')
      .then((t) => (JSON.parse(t) as { services?: Found[] }).services ?? [])
      .catch(() => [] as Found[]);
    const byId = new Map(found.map((f) => [f.id, f]));
    for (const old of prev) {
      const entry = byId.get(old.id);
      if (entry) {
        for (const f of kept) if (old[f] && !entry[f]) (entry[f] as unknown) = old[f];
      } else if (kept.some((f) => old[f])) {
        const carried: Found = { id: old.id, name: old.name };
        for (const f of kept) if (old[f]) (carried[f] as unknown) = old[f];
        if (old.blocked) carried.blocked = old.blocked;
        found.push(carried);
        byId.set(old.id, carried);
      }
    }
  }

  found.sort((a, b) => a.id.localeCompare(b.id));
  await writeJson(CANDIDATES_FILE, { generated_at: new Date().toISOString(), services: found });
  await writeFile(REPORT_FILE, renderReport(found), 'utf8');

  const stats = tally(found);
  log.info(
    `확인 ${stats.verified}건 · 사람 확인 필요 ${stats.weak}건 · 기각 ${stats.rejected}건`,
  );
  log.info(`후보: ${CANDIDATES_FILE}`);
  log.info(`보고서: ${REPORT_FILE}`);

  if (apply) {
    const n = await applyToSeed(found);
    log.info(`시드에 ${n}건 기록. npm run seed 로 반영하고 npm run probe 를 다시 돌린다.`);
  } else if (stats.verified > 0) {
    log.info(`--apply 를 붙이면 확인된 ${stats.verified}건을 시드에 쓴다.`);
  }
}

function tally(found: Found[]): { verified: number; weak: number; rejected: number } {
  const out = { verified: 0, weak: 0, rejected: 0 };
  for (const f of found) {
    for (const list of [f.signup_url, f.support_url, f.ios_app_id, f.android_package]) {
      for (const c of list ?? []) out[c.verdict] += 1;
    }
  }
  return out;
}

const FIELD_LABELS: Record<string, string> = {
  signup_url: '가입 주소',
  support_url: '고객지원 주소',
  ios_app_id: 'iOS 앱 ID',
  android_package: 'Android 패키지',
};

function renderReport(found: Found[]): string {
  const lines: string[] = [
    '# 힌트 후보',
    '',
    `\`npm run find-hints\` 가 생성. ${new Date().toISOString().slice(0, 10)}`,
    '',
    '`확인` 은 실제로 열어 보고 조건을 만족한 것이라 `--apply` 로 자동 기록된다.',
    '`검토` 는 사람이 맞는지 봐야 하는 것이다. 확신이 없으면 비워 두는 편이 낫다 —',
    '틀린 주소는 틀린 사실을 발표한다.',
    '',
  ];

  const withVerified = found.filter((f) =>
    [f.signup_url, f.support_url, f.ios_app_id, f.android_package].some((l) =>
      l?.some((c) => c.verdict === 'verified'),
    ),
  );
  const needsReview = found.filter(
    (f) =>
      !withVerified.includes(f) &&
      [f.signup_url, f.support_url, f.ios_app_id, f.android_package].some((l) =>
        l?.some((c) => c.verdict === 'weak'),
      ),
  );
  const blocked = found.filter((f) => f.blocked && !withVerified.includes(f) && !needsReview.includes(f));

  const section = (title: string, list: Found[], want: Verdict[]): void => {
    if (list.length === 0) return;
    lines.push(`## ${title} (${list.length})`, '');
    for (const f of list) {
      lines.push(`### ${f.id} — ${f.name}`);
      for (const [field, cands] of Object.entries({
        signup_url: f.signup_url,
        support_url: f.support_url,
        ios_app_id: f.ios_app_id,
        android_package: f.android_package,
      })) {
        const picked = (cands as Candidate[] | undefined)?.filter((c) => want.includes(c.verdict));
        if (!picked || picked.length === 0) continue;
        lines.push('', `**${FIELD_LABELS[field]}**`, '');
        for (const c of picked) {
          lines.push(`- \`${c.value}\` — ${c.why}`);
        }
      }
      lines.push('');
    }
  };

  section('확인됨 — 자동 기록 대상', withVerified, ['verified']);
  section('검토 필요 — 사람이 골라야 함', needsReview, ['weak']);

  if (blocked.length > 0) {
    lines.push(`## 탐색 불가 (${blocked.length})`, '');
    lines.push('사이트가 자동 접근을 막는다. 이 항목들은 제보로만 채워진다.', '');
    for (const f of blocked) lines.push(`- **${f.id}** ${f.name} — ${f.blocked}`);
    lines.push('');
  }

  return lines.join('\n');
}

/** verified 후보 하나씩만 시드에 쓴다. 이미 값이 있으면 건드리지 않는다. */
async function applyToSeed(found: Found[]): Promise<number> {
  const file = PATHS.seeds;
  const raw = JSON.parse(await readFile(file, 'utf8')) as {
    services: SeedService[];
    updated_at?: string;
  };

  let written = 0;
  for (const f of found) {
    const seed = raw.services.find((s) => s.id === f.id);
    if (!seed) continue;
    const hints = { ...(seed.hints ?? {}) };

    for (const [field, cands] of Object.entries({
      signup_url: f.signup_url,
      support_url: f.support_url,
      ios_app_id: f.ios_app_id,
      android_package: f.android_package,
    }) as [keyof typeof hints, Candidate[] | undefined][]) {
      if (hints[field]) continue;
      const pick = cands?.find((c) => c.verdict === 'verified');
      if (!pick) continue;
      hints[field] = pick.value;
      written += 1;
    }

    if (Object.keys(hints).length > 0) seed.hints = hints;
  }

  raw.updated_at = new Date().toISOString().slice(0, 10);
  await writeFile(file, `${JSON.stringify(raw, null, 2)}\n`, 'utf8');
  return written;
}

main().catch((e: unknown) => {
  log.error(String(e));
  process.exitCode = 1;
});
