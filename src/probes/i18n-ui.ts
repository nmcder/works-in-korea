/**
 * 프로브 2 — i18n_ui: 영·중·일 UI가 실제로 있나?
 *
 * 세 가지 근거를 모은다.
 *  1) <html lang> / hreflang 선언        — 사이트가 스스로 주장하는 언어
 *  2) Accept-Language를 바꿨을 때의 응답 차이 — 주장이 실제로 작동하는가
 *  3) /en, /english, /global 류 경로의 실존 확인 — 별도 영문 포털 유무
 *
 * "선언은 있는데 실제로는 안 바뀌더라"를 잡아내는 것이 이 프로브의 핵심이다.
 */
import { extractLinks, normalizeUrl, politeFetch, visibleText } from '../lib/http.js';
import type { I18nUiValue, ProbeResult, Service } from '../types.js';
import { isUsableResponse } from './overseas-access.js';

const ENGLISH_PATH_CANDIDATES = ['/en', '/en/', '/english', '/eng', '/global', '/en-us', '/intl'];

const LANG_LINK_HINTS: { code: string; needles: string[] }[] = [
  { code: 'en', needles: ['english', '영어', 'eng', '/en/', '/en?', 'lang=en', 'locale=en'] },
  { code: 'ja', needles: ['日本語', 'japanese', '일본어', '/ja/', 'lang=ja', 'locale=ja'] },
  { code: 'zh', needles: ['中文', '简体', '繁體', 'chinese', '중국어', '/zh/', 'lang=zh'] },
];

export async function probeI18nUi(service: Service): Promise<ProbeResult<I18nUiValue>> {
  const enRes = await politeFetch(service.url, {
    headers: { 'accept-language': 'en-US,en;q=0.9' },
  });

  // 차단·오류 페이지를 언어 근거로 쓰면 "이 서비스는 한국어만 제공"처럼 사실과 다른 값이 나온다.
  // 2xx/3xx 본문을 받았을 때만 측정한다.
  if (enRes.blockedReason || enRes.error !== null || !enRes.body || !isUsableResponse(enRes.status)) {
    return {
      value: null,
      confidence: 'unknown',
      evidence: {
        not_measured: enRes.blockedReason ?? enRes.error ?? `http_status=${enRes.status}`,
        http_status: enRes.status,
        note: '정상 응답을 받지 못해 언어 제공 여부를 판정하지 않았다 (차단·오류 페이지는 근거로 쓰지 않는다).',
      },
    };
  }

  const koRes = await politeFetch(service.url, {
    headers: { 'accept-language': 'ko-KR,ko;q=0.9' },
  });

  const html = enRes.body;
  const declaredHtmlLang = matchOne(/<html\b[^>]*\blang\s*=\s*["']([^"']+)["']/i, html);
  const hreflangs = [...html.matchAll(/\bhreflang\s*=\s*["']([^"']+)["']/gi)]
    .map((m) => (m[1] ?? '').toLowerCase())
    .filter((v) => v !== '' && v !== 'x-default');
  const uniqueHreflangs = [...new Set(hreflangs)];

  // 언어 전환 링크 탐지
  const links = extractLinks(html, enRes.finalUrl ?? service.url);
  const linkHints: Record<string, string[]> = {};
  for (const { code, needles } of LANG_LINK_HINTS) {
    const hits = links
      .filter((l) => {
        const hay = `${l.href} ${l.text}`.toLowerCase();
        return needles.some((n) => hay.includes(n.toLowerCase()));
      })
      .slice(0, 5)
      .map((l) => l.href);
    if (hits.length > 0) linkHints[code] = hits;
  }

  // Accept-Language 변조가 실제로 응답을 바꾸는가
  const acceptLanguageResponsive =
    koRes.ok && koRes.bodySha256 !== null && enRes.bodySha256 !== null
      ? koRes.bodySha256 !== enRes.bodySha256
      : null;

  // 영문 전용 경로 존재 확인 (힌트가 있으면 그것만, 없으면 후보 2개까지만 두드린다)
  const englishUrlChecks: { url: string; status: number | null; ok: boolean }[] = [];
  const hintUrl = service.hints?.english_url ?? null;
  const candidates = hintUrl
    ? [hintUrl]
    : ENGLISH_PATH_CANDIDATES.slice(0, 2).map((p) => safeJoin(service.url, p));
  for (const candidate of candidates) {
    if (!candidate) continue;
    const res = await politeFetch(candidate, {
      headers: { 'accept-language': 'en-US,en;q=0.9' },
    });
    const distinct =
      res.ok &&
      res.bodySha256 !== null &&
      res.bodySha256 !== enRes.bodySha256 &&
      normalizeUrl(res.finalUrl ?? '') !== normalizeUrl(enRes.finalUrl ?? service.url);
    englishUrlChecks.push({ url: candidate, status: res.status, ok: Boolean(distinct) });
    if (distinct) break;
  }

  // 영문 UI의 실제성 근거: 라틴 문자 비율
  const text = visibleText(html, 8000);
  const latinRatio = ratioOf(text, /[A-Za-z]/g);
  const hangulRatio = ratioOf(text, /[가-힣]/g);

  const languages = new Set<string>();
  languages.add('ko'); // 한국 서비스이므로 기준선
  if (declaredHtmlLang) languages.add(normalizeLang(declaredHtmlLang));
  for (const hl of uniqueHreflangs) languages.add(normalizeLang(hl));
  for (const code of Object.keys(linkHints)) languages.add(code);
  if (englishUrlChecks.some((c) => c.ok)) languages.add('en');

  const value = [...languages].filter((l) => l.length >= 2).sort();

  return {
    value,
    confidence: 'auto',
    evidence: {
      declared_html_lang: declaredHtmlLang,
      hreflang: uniqueHreflangs.slice(0, 20),
      language_switcher_links: linkHints,
      english_url_checks: englishUrlChecks,
      accept_language_responsive: acceptLanguageResponsive,
      latin_char_ratio: round(latinRatio),
      hangul_char_ratio: round(hangulRatio),
      note:
        'ko는 한국 서비스 기준선으로 항상 포함된다. ko 외 언어는 선언(hreflang/lang)·전환 링크·전용 경로 중 하나 이상에서 탐지된 것이며, 번역 품질이나 커버리지는 측정하지 않는다.',
    },
  };
}

function matchOne(re: RegExp, input: string): string | null {
  const m = re.exec(input);
  return m?.[1] ?? null;
}

function normalizeLang(raw: string): string {
  return raw.trim().toLowerCase().split(/[-_]/)[0] ?? raw;
}

function ratioOf(text: string, re: RegExp): number {
  if (text.length === 0) return 0;
  const matches = text.match(re);
  return (matches?.length ?? 0) / text.length;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function safeJoin(base: string, path: string): string | null {
  try {
    return new URL(path, base).toString();
  } catch {
    return null;
  }
}
