/**
 * 개인정보 차단 — 접수 단계.
 *
 * ⚠️ 같은 검사를 `src/lib/reports.ts` 도 갖고 있다. 중복이 아니라 이중 방어다.
 *   여기(접수)  개인정보로 보이면 GitHub 에 **아예 올리지 않는다**.
 *   저기(수집)  그래도 들어온 것을 저장 전에 한 번 더 거른다.
 * 하나가 뚫려도 다른 하나가 막는다. 패턴을 고칠 때는 반드시 양쪽을 같이 고칠 것.
 *
 * 넓게 잡는다. 애매한 제보를 사람이 한 번 더 보는 비용보다
 * 개인정보가 공개 저장소에 남는 사고의 비용이 비교할 수 없이 크다.
 */
const PERSONAL_PATTERNS: { id: string; re: RegExp }[] = [
  { id: 'email', re: /[\w.+-]+@[\w-]+\.[\w.]{2,}/ },
  // 카드번호처럼 보이는 것 — 구분자 포함 13자리 이상
  { id: 'card-number', re: /(?:\d[ -]?){13,19}/ },
  // 국제전화 형태
  { id: 'phone', re: /\+\d{1,3}[\s-]?\d[\d\s-]{6,}/ },
  // 한국 휴대폰
  { id: 'phone-kr', re: /01[016789][\s-]?\d{3,4}[\s-]?\d{4}/ },
  // 주민등록번호
  { id: 'rrn', re: /\d{6}[\s-]?[1-8]\d{6}/ },
  { id: 'account-url', re: /https?:\/\/\S*(?:passport|account|mypage)\S*\?\S+/i },
];

export interface ScreenResult {
  clean: boolean;
  hits: string[];
}

export function screenForPersonalData(text: string | null | undefined): ScreenResult {
  if (!text) return { clean: true, hits: [] };
  const hits: string[] = [];
  for (const p of PERSONAL_PATTERNS) if (p.re.test(text)) hits.push(p.id);
  return { clean: hits.length === 0, hits };
}

/** 걸린 항목을 사람이 읽는 말로. 무엇을 지우면 되는지 알려주기 위해서다. */
export const HIT_LABELS: Record<string, { en: string; ko: string }> = {
  email: { en: 'an email address', ko: '이메일 주소' },
  'card-number': { en: 'something that looks like a card number', ko: '카드번호로 보이는 숫자' },
  phone: { en: 'a phone number', ko: '전화번호' },
  'phone-kr': { en: 'a Korean phone number', ko: '한국 휴대폰 번호' },
  rrn: { en: 'a resident registration number', ko: '주민등록번호' },
  'account-url': { en: 'a link to a personal account page', ko: '개인 계정 페이지 주소' },
};
