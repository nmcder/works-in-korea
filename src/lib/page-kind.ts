/**
 * 페이지 종류 판별 — 가입 페이지인가 로그인 페이지인가.
 *
 * 왜 필요한가: 한국 서비스는 로그인과 회원가입이 한 화면에 있거나, 회원가입 버튼이
 * 로그인 화면 안에만 있는 경우가 많다. 운영자가 로그인 주소를 힌트로 넣었을 때
 * 그 측정을 "가입에 본인인증이 필요하다"로 발표하면 잰 것과 발표한 것이 달라진다.
 *
 * 그래서 페이지 안에 가입 관련 표시가 있는지를 보고,
 *   - 가입 표시가 있으면 → 가입 절차를 잰 것으로 인정 (signup / combined)
 *   - 로그인 표시만 있으면 → login. 이 경우 signup_phone_auth 는 unknown 으로 남긴다.
 */

const SIGNUP_MARKERS = [
  '회원가입',
  '회원 가입',
  '가입하기',
  '신규가입',
  '신규 가입',
  '가입신청',
  '통합회원',
  'sign up',
  'signup',
  'sign-up',
  'create account',
  'create an account',
  'join now',
  'register',
  '약관동의',
  '약관에 동의',
  '이용약관 동의',
];

const LOGIN_MARKERS = [
  '로그인',
  '아이디',
  '비밀번호',
  'sign in',
  'signin',
  'log in',
  'login',
  'password',
];

export type PageKind = 'signup' | 'combined' | 'login' | 'unknown';

export interface PageKindResult {
  kind: PageKind;
  signupMarkers: string[];
  loginMarkers: string[];
  /** signup_phone_auth 판정 근거로 써도 되는가 */
  usableForSignup: boolean;
}

export function detectPageKind(html: string, text: string): PageKindResult {
  const hay = `${text}\n${stripAttributesButKeepText(html)}`.toLowerCase();

  const signupMarkers = SIGNUP_MARKERS.filter((m) => hay.includes(m.toLowerCase()));
  const loginMarkers = LOGIN_MARKERS.filter((m) => hay.includes(m.toLowerCase()));

  let kind: PageKind;
  if (signupMarkers.length > 0 && loginMarkers.length > 0) kind = 'combined';
  else if (signupMarkers.length > 0) kind = 'signup';
  else if (loginMarkers.length > 0) kind = 'login';
  else kind = 'unknown';

  return {
    kind,
    signupMarkers,
    loginMarkers,
    // 가입 표시가 하나라도 있으면 가입 절차가 그 페이지에서 시작된다고 본다.
    usableForSignup: signupMarkers.length > 0,
  };
}

/**
 * 사람이 입력하는 칸의 개수.
 *
 * 안내 페이지(링크와 문단만 있는 문서)와 실제 가입 양식을 구분하는 데 쓴다.
 * "본인인증 위젯이 안 보인다"는 진짜 입력 양식을 봤을 때만 의미가 있기 때문이다.
 * hidden/submit/button 은 사람이 채우는 칸이 아니므로 세지 않는다.
 */
export function countFormInputs(html: string): number {
  let count = 0;
  const re = /<(input|select|textarea)\b([^>]*)>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const tag = (m[1] ?? '').toLowerCase();
    const attrs = (m[2] ?? '').toLowerCase();
    if (tag === 'input') {
      const type = /\btype\s*=\s*["']?([a-z-]+)/.exec(attrs)?.[1] ?? 'text';
      if (['hidden', 'submit', 'button', 'image', 'reset'].includes(type)) continue;
    }
    count += 1;
    if (count > 200) break;
  }
  return count;
}

/** 태그는 지우되 alt/title/placeholder 같은 사람이 보는 문자열은 남긴다 */
function stripAttributesButKeepText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*\b(?:alt|title|placeholder|aria-label)\s*=\s*["']([^"']*)["'][^>]*>/gi, ' $1 ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 200_000);
}
