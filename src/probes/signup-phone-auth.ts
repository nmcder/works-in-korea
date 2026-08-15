/**
 * 프로브 3 — signup_phone_auth: 가입에 한국 휴대폰 본인인증이 강제인가?
 *
 * ⚠️ 절대 규칙 (CLAUDE.md 4, D-6): 계정 생성이나 로그인을 시도하지 않는다.
 *    가입 페이지를 열어 DOM만 읽고, 본인인증 위젯 시그니처가 있는지 본다.
 *
 * 판정 (근거가 약하면 값을 내지 않고 unknown 으로 둔다):
 *   위젯 URL 시그니처 탐지, 또는 텍스트 시그니처 + 실제 입력 양식
 *       + 대안 가입 경로(이메일/소셜) 있음  → optional
 *       + 대안 없음                          → required
 *   입력 양식은 있는데 위젯이 안 보임         → not_required
 *   로그인 전용 화면 / 입력란 없는 안내 페이지 → unknown
 *   페이지를 못 열었거나 후보 URL 없음        → unknown
 *
 * "입력 양식이 있는가"를 함께 보는 이유: 회원가입 '안내' 문서는 본인인증 위젯이 없는 게
 * 당연하므로, 그걸 근거로 not_required 를 발표하면 재지 않은 것을 발표하는 셈이다.
 * 반대로 안내문이 "주민등록번호"를 언급한다는 이유로 required 를 발표해도 안 된다.
 *
 * required/optional 구분은 휴리스틱이라 evidence에 매칭 근거를 전부 남긴다.
 * 반증이 오면 커뮤니티 제보로 정정한다.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PATHS } from '../config.js';
import { snapshotPage } from '../lib/browser.js';
import { politeFetch } from '../lib/http.js';
import { countFormInputs, detectPageKind } from '../lib/page-kind.js';
import type { ProbeResult, Service, SignupPhoneAuthValue } from '../types.js';

interface VendorSig {
  id: string;
  name: string;
  url: string[];
  text: string[];
}
interface IdentitySignatures {
  vendors: VendorSig[];
  alternative_signup_markers: { text: string[]; url: string[] };
}

let cached: IdentitySignatures | null = null;

async function signatures(): Promise<IdentitySignatures> {
  if (cached) return cached;
  const raw = await readFile(path.join(PATHS.signatures, 'identity-verification.json'), 'utf8');
  cached = JSON.parse(raw) as IdentitySignatures;
  return cached;
}

/** 힌트가 없을 때 두드려 볼 흔한 가입 경로. 요청 수를 줄이려고 짧게 유지한다. */
const SIGNUP_PATH_CANDIDATES = ['/join', '/signup', '/member/join', '/register', '/user/join'];

export async function probeSignupPhoneAuth(
  service: Service,
): Promise<ProbeResult<SignupPhoneAuthValue>> {
  const sigs = await signatures();
  const attempts: { url: string; status: number | null; used: boolean; reason?: string }[] = [];

  const signupUrl = await findSignupUrl(service, attempts);
  if (!signupUrl) {
    return {
      value: 'unknown',
      confidence: 'unknown',
      evidence: {
        not_measured: '가입 페이지를 찾지 못함',
        attempts,
        hint: 'data/seeds/services.seed.json 의 hints.signup_url 을 채우면 측정 가능해진다',
      },
    };
  }

  const page = await snapshotPage(signupUrl);
  if (!page.ok || !page.html) {
    return {
      value: 'unknown',
      confidence: 'unknown',
      evidence: {
        not_measured: page.blockedReason ?? page.error ?? '페이지 로드 실패',
        signup_url: signupUrl,
        attempts,
      },
    };
  }

  const haystackUrls = [...page.requestedUrls, ...extractSrcs(page.html)].join('\n').toLowerCase();
  const haystackText = `${page.visibleText ?? ''}\n${stripTags(page.html)}`;

  // 로그인 전용 페이지를 근거로 "가입에 본인인증이 필요하다"고 발표하면 잰 것과 발표한 것이 달라진다.
  // 가입 관련 표시가 하나도 없으면 판정을 보류한다. (CLAUDE.md 절대규칙 5·6)
  const pageKind = detectPageKind(page.html, page.visibleText ?? '');
  if (!pageKind.usableForSignup) {
    return {
      value: 'unknown',
      confidence: 'unknown',
      evidence: {
        not_measured: '가입 절차가 아니라 로그인 화면으로 보임 — 가입 단계의 본인인증 여부는 판정하지 않음',
        signup_url: signupUrl,
        final_url: page.finalUrl,
        http_status: page.status,
        page_kind: pageKind.kind,
        login_markers: pageKind.loginMarkers,
        attempts,
        hint: '가입 화면으로 직접 들어가는 주소를 hints.signup_url 에 넣으면 측정된다',
      },
    };
  }

  const matchedVendors: { id: string; name: string; matched: string; via: 'url' | 'text' }[] = [];
  for (const vendor of sigs.vendors) {
    const urlHit = vendor.url.find((needle) => haystackUrls.includes(needle.toLowerCase()));
    if (urlHit) {
      matchedVendors.push({ id: vendor.id, name: vendor.name, matched: urlHit, via: 'url' });
      continue;
    }
    const textHit = vendor.text.find((needle) => haystackText.includes(needle));
    if (textHit) {
      matchedVendors.push({ id: vendor.id, name: vendor.name, matched: textHit, via: 'text' });
    }
  }

  const altText = sigs.alternative_signup_markers.text.filter((n) => haystackText.includes(n));
  const altUrl = sigs.alternative_signup_markers.url.filter((n) =>
    haystackUrls.includes(n.toLowerCase()),
  );
  const hasAlternative = altText.length > 0 || altUrl.length > 0;

  // url 시그니처로 잡힌 것만 강한 근거로 본다 (텍스트 문구는 안내문일 수 있어 오탐 위험)
  const strongMatches = matchedVendors.filter((m) => m.via === 'url');
  const anyMatch = matchedVendors.length > 0;

  // "위젯이 안 보인다"는 진짜 가입 양식을 봤을 때만 의미가 있다.
  // 회원가입 '안내' 페이지처럼 입력란이 없는 문서를 근거로 not_required 를 발표하면
  // 재지 않은 것을 발표하는 셈이 된다. (신한은행 사례에서 실제로 발생)
  const formInputs = countFormInputs(page.html);
  const looksLikeForm = formInputs >= 2;

  // 텍스트 문구만 잡힌 경우는 안내문일 수 있다. 실제 입력 양식이 함께 보일 때만 인정한다.
  // (신한은행 "회원가입안내" 페이지가 i-PIN·주민등록번호를 언급한다는 이유로 required 로
  //  판정되던 오탐을 막는다.)
  const positiveEvidence = strongMatches.length > 0 || (anyMatch && looksLikeForm);

  let value: SignupPhoneAuthValue;
  if (positiveEvidence) {
    value = hasAlternative ? 'optional' : 'required';
  } else if (looksLikeForm) {
    value = 'not_required';
  } else {
    return {
      value: 'unknown',
      confidence: 'unknown',
      evidence: {
        not_measured:
          '입력란이 있는 가입 양식을 확인하지 못함 (안내 페이지로 보임) — 본인인증 요구 여부를 판정하지 않음',
        signup_url: signupUrl,
        final_url: page.finalUrl,
        http_status: page.status,
        page_kind: pageKind.kind,
        form_input_count: formInputs,
        attempts,
        hint: '실제 가입 양식이 뜨는 주소를 hints.signup_url 에 넣으면 측정된다',
      },
    };
  }

  return {
    value,
    confidence: 'auto',
    evidence: {
      signup_url: signupUrl,
      final_url: page.finalUrl,
      http_status: page.status,
      page_kind: pageKind.kind,
      signup_markers: pageKind.signupMarkers,
      form_input_count: formInputs,
      matched_vendors: matchedVendors,
      strong_url_matches: strongMatches.length,
      alternative_signup_markers: { text: altText, url: altUrl },
      attempts,
      detection_note:
        'DOM에서 본인인증 위젯 시그니처를 탐지한 결과다. 가입을 시도하지 않으므로 required/optional 구분은 "대안 가입 경로가 함께 보이는가"에 근거한 휴리스틱이며, 반증 제보로 정정 가능하다.',
    },
  };
}

async function findSignupUrl(
  service: Service,
  attempts: { url: string; status: number | null; used: boolean; reason?: string }[],
): Promise<string | null> {
  const hint = service.hints?.signup_url;
  if (hint) {
    attempts.push({ url: hint, status: null, used: true, reason: 'hints.signup_url' });
    return hint;
  }
  for (const candidate of SIGNUP_PATH_CANDIDATES) {
    let url: string;
    try {
      url = new URL(candidate, service.url).toString();
    } catch {
      continue;
    }
    const res = await politeFetch(url, { discardBody: true });
    const usable = res.status !== null && res.status >= 200 && res.status < 400;
    attempts.push({
      url,
      status: res.status,
      used: usable,
      reason: res.blockedReason ?? res.error ?? undefined,
    });
    if (usable) return res.finalUrl ?? url;

    // robots가 막았거나 사이트가 봇을 403으로 거르는 경우, 나머지 경로도 같은 결과다.
    // 같은 사이트에 헛되이 5번 요청하는 것은 저빈도 원칙에 어긋난다.
    if (res.blockedReason !== null || res.status === 403 || res.status === 429) {
      attempts.push({
        url: `${service.url} (이하 후보)`,
        status: res.status,
        used: false,
        reason: '첫 후보가 차단되어 나머지 후보 탐색을 중단함 (불필요한 요청 방지)',
      });
      return null;
    }
  }
  return null;
}

function extractSrcs(html: string): string[] {
  const out: string[] = [];
  const re = /\b(?:src|data-src|action)\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    out.push(m[1]!);
    if (out.length >= 600) break;
  }
  return out;
}

/**
 * 사람이 입력하는 칸의 개수. 안내 페이지(링크와 문단만 있는 문서)와
 * 실제 가입 양식을 구분하는 데 쓴다. hidden/submit 은 세지 않는다.
 */
function stripTags(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 200_000);
}
