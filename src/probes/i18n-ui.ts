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
import { snapshotPage } from '../lib/browser.js';
import { extractLinks, normalizeUrl, politeFetch, visibleText } from '../lib/http.js';
import type { I18nUiValue, ProbeResult, Service } from '../types.js';
import { isUsableResponse } from './overseas-access.js';

const ENGLISH_PATH_CANDIDATES = ['/en', '/en/', '/english', '/eng', '/global', '/en-us', '/intl'];

/**
 * 언어 전환 수단을 알아보는 낱말들.
 *
 * `href` 와 `screen` 을 나눈 이유: 주소에서는 `eng`·`/en/` 같은 짧은 조각이 쓸모
 * 있지만, 화면 글자에서 그걸 찾으면 "strength"·"length" 같은 낱말에 걸린다.
 * 반대로 `中文` 은 두 글자뿐이라 길이로 거르면 탈락하는데, 화면에 그 두 글자가
 * 있으면 그건 거의 확실히 언어 전환이다. 그래서 규칙을 자리별로 따로 둔다.
 *
 * 실제로 이 구분이 없어서 코레일의 중국어를 놓쳤다 — 화면에 中文(简体)·中文(繁體)가
 * 버젓이 있는데 "두 글자라서" 걸러졌다.
 *
 * 언어 목록이 유럽어가 아니라 베트남어·태국어·인도네시아어·몽골어 쪽인 것은
 * 이 사이트를 보는 사람이 그쪽이기 때문이다. 한국 공공기관은 대개 이 조합을 낸다.
 */
const LANG_LINK_HINTS: { code: string; href: string[]; screen: string[] }[] = [
  { code: 'en', href: ['english', 'eng', '/en/', '/en?', 'lang=en', 'locale=en'], screen: ['english', '영어'] },
  { code: 'ja', href: ['japanese', '/ja/', 'lang=ja', 'locale=ja'], screen: ['日本語', 'japanese', '일본어'] },
  { code: 'zh', href: ['chinese', '/zh/', 'lang=zh', 'locale=zh'], screen: ['中文', '简体', '繁體', 'chinese', '중국어'] },
  { code: 'vi', href: ['/vi/', 'lang=vi', 'locale=vi'], screen: ['tiếng việt', 'vietnamese', '베트남어'] },
  { code: 'th', href: ['/th/', 'lang=th', 'locale=th'], screen: ['ภาษาไทย', 'thai', '태국어'] },
  { code: 'id', href: ['/id/', 'lang=id', 'locale=id'], screen: ['indonesia', '인니어', '인도네시아어'] },
  { code: 'ru', href: ['/ru/', 'lang=ru', 'locale=ru'], screen: ['русский', 'russian', '러시아어'] },
  { code: 'mn', href: ['/mn/', 'lang=mn', 'locale=mn'], screen: ['монгол', 'mongolian', '몽골어'] },
  { code: 'km', href: ['/km/', 'lang=km', 'locale=km'], screen: ['ភាសាខ្មែរ', 'khmer', '캄보디아어'] },
];

/**
 * 링크와 화면 글자에서 언어 전환 수단을 찾는다.
 *
 * 화면 글자까지 보는 이유: 코레일처럼 전환 메뉴가 <a> 가 아니라 버튼·드롭다운으로
 * 되어 있으면 링크만 훑어서는 안 걸린다. 그런데 "English", "日本語" 같은 낱말은
 * 그려진 화면에 그대로 있다.
 */
function detectLanguageLinks(
  links: { href: string; text: string }[],
  screenText: string,
): Record<string, string[]> {
  const hints: Record<string, string[]> = {};
  const screen = screenText.toLowerCase();
  for (const { code, href, screen: screenNeedles } of LANG_LINK_HINTS) {
    const hits = links
      .filter((l) => {
        const hay = `${l.href} ${l.text}`.toLowerCase();
        return (
          href.some((n) => hay.includes(n)) || screenNeedles.some((n) => hay.includes(n.toLowerCase()))
        );
      })
      .slice(0, 5)
      .map((l) => l.href);
    if (hits.length > 0) {
      hints[code] = hits;
      continue;
    }
    // 링크로는 못 찾았지만 화면에 언어 이름이 적혀 있는 경우 (버튼·드롭다운)
    const onScreen = screenNeedles.filter((n) => screen.includes(n.toLowerCase()));
    if (onScreen.length > 0) hints[code] = [`화면 표기: ${onScreen.join(', ')}`];
  }
  return hints;
}

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
  const linkHints = detectLanguageLinks(links, '');

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

  /*
   * 여기까지 ko 말고 아무것도 못 찾았으면, **아직 아무것도 재지 못한 것이다.**
   *
   * 전에는 그대로 ["ko"] 를 내보냈다. 그러면 화면에 빨간 "한국어만"이 뜬다 —
   * 못 찾은 것을 없다고 발표하는 것이고, 이 프로젝트가 하지 않기로 한 바로 그 일이다.
   *
   * 실제로 코레일이 이렇게 걸렸다. 메인에 한국어·English·日本語·中文(간/번)·
   * Tiếng Việt·ภาษาไทย·Indonesia 여덟 개가 버젓이 있는데 "한국어만"으로 나가고 있었다.
   * 전환 메뉴가 자바스크립트로 그려지고, /en 은 404 이며(영문은 /global/main),
   * hreflang 태그도 없어서 원본 HTML 만 봐서는 하나도 안 보였다.
   *
   * 우리 데이터 안에서 모순이 13건 잡혔다 — 영어 고객지원을 "있음"으로 확인해 놓고
   * 같은 서비스의 화면 언어는 "한국어만"이라고 발표하고 있었다 (NHIS·신한은행·SKT…).
   *
   * 그래서 두 단계로 바꾼다.
   *   1) 원본 HTML 에서 못 찾으면 **브라우저로 그려서 다시 본다.** 대부분 여기서 잡힌다.
   *   2) 그래도 못 찾으면 값을 내지 않는다. "한국어만"은 확인했을 때만 쓴다.
   */
  if (languages.size === 1) {
    const rendered = await snapshotPage(service.url);
    const renderedFound = rendered.html
      ? detectLanguageLinks(extractLinks(rendered.html, service.url), rendered.visibleText ?? '')
      : {};
    for (const code of Object.keys(renderedFound)) languages.add(code);

    if (languages.size === 1) {
      return {
        value: null,
        confidence: 'unknown',
        evidence: {
          not_measured: '언어 전환 수단을 찾지 못했다',
          declared_html_lang: declaredHtmlLang,
          hreflang: uniqueHreflangs.slice(0, 20),
          english_url_checks: englishUrlChecks,
          rendered_checked: rendered.html !== null,
          rendered_error: rendered.error ?? rendered.blockedReason,
          note: '전환 링크·hreflang·전용 경로 어디서도 한국어 외 언어를 찾지 못했다. 브라우저로 그려서도 다시 봤다. 이것은 "한국어만 제공한다"는 뜻이 아니라 "찾지 못했다"는 뜻이므로 값을 내지 않는다 — 사람이 직접 봐야 한다.',
        },
      };
    }
  }

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
