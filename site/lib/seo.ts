/**
 * 검색 노출용 조각.
 *
 * 이 사이트에 사람이 오는 경로는 둘이다. 커뮤니티 글, 그리고 문제가 터진 순간의 검색.
 * 후자가 더 값지다 — "coupang foreign card not working" 을 치는 사람은 이미 겪은
 * 사람이고, 겪은 사람만이 제보할 수 있기 때문이다. 봇이 영원히 못 채우는 36곳은
 * 그렇게 온 사람 말고는 채울 방법이 없다.
 *
 * 그래서 페이지마다 **실제 측정값이 들어간** 설명을 만든다. 106개가 같은 문구를
 * 달고 있으면 검색엔진이 구분할 이유가 없고, 사람도 클릭할 이유가 없다.
 */
import type { Service } from './types';
import { AUTO_KEYS, viewSignal } from './present';

/** 페이지 설명 — 실제로 잰 답을 담는다. 없으면 없다고 쓴다. */
export function serviceDescription(service: Service): string {
  const parts: string[] = [];

  const access = viewSignal(service, 'overseas_access');
  if (access.tone !== 'none') parts.push(`Opens from outside Korea: ${access.display.en}`);

  const lang = viewSignal(service, 'i18n_ui');
  if (lang.tone !== 'none') parts.push(`Interface: ${lang.display.en}`);

  const signup = viewSignal(service, 'signup_phone_auth');
  if (signup.tone !== 'none') parts.push(`Korean phone to sign up: ${signup.display.en}`);

  const support = viewSignal(service, 'support_en');
  if (support.tone !== 'none') parts.push(`English support: ${support.display.en}`);

  const measured = AUTO_KEYS.map((k) => viewSignal(service, k).measuredAt)
    .filter((t): t is string => Boolean(t))
    .sort()
    .at(-1);

  const head = `${service.name.en} (${service.name.ko}) checked from outside Korea.`;
  const body =
    parts.length > 0
      ? parts.join('. ')
      : 'This service blocks automated checks, so the values are waiting on first-hand reports';
  const tail = measured ? ` Measured ${measured.slice(0, 10)}.` : '';

  return `${head} ${body}.${tail}`.slice(0, 300);
}

/**
 * 구조화 데이터. 스크립트 태그 안에 그대로 넣는다.
 *
 * `</script>` 가 값 안에 들어가면 태그가 일찍 닫혀 페이지가 깨지므로 막아 둔다.
 * 서비스 이름은 우리가 관리하는 값이지만, 나중에 제보에서 온 문자열이 여기 들어올
 * 수 있으므로 통로 자체를 막는 편이 낫다.
 */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/** 서비스 상세 = 질문과 답의 목록. 그대로 FAQPage 다. */
export function serviceFaq(service: Service, url: string): unknown {
  const entries = AUTO_KEYS.map((k) => viewSignal(service, k))
    .filter((v) => v.tone !== 'none')
    .map((v) => ({
      '@type': 'Question',
      name: `${service.name.en}: ${v.question.en}`,
      acceptedAnswer: {
        '@type': 'Answer',
        text: v.caveat ? `${v.display.en}. ${v.caveat.en}` : v.display.en,
      },
    }));

  if (entries.length === 0) return null;
  return { '@context': 'https://schema.org', '@type': 'FAQPage', url, mainEntity: entries };
}

/**
 * 사이트 전체 = 공개 데이터셋. Google Dataset Search 에 잡힌다.
 *
 * 이 프로젝트에는 잘 맞는 통로다 — 데이터셋으로 찾는 사람은 재사용할 사람이고,
 * 재사용하는 사람이 보내는 정정이 가장 정확하다.
 */
export function datasetSchema(opts: {
  url: string;
  services: number;
  modified: string | null;
  license: string;
}): unknown {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'Works in Korea?',
    description:
      `Daily measurements of whether ${opts.services} Korean online services work for people ` +
      'without a Korean phone number, card, or address: access from outside Korea, interface ' +
      'languages, Korean phone verification at sign-up, app store listings, payment providers, ' +
      'and English support. Every value carries the time it was measured, the method, and how ' +
      'confident it is. Values that could not be measured are recorded as unknown with the reason.',
    url: opts.url,
    license: opts.license,
    isAccessibleForFree: true,
    creator: { '@type': 'Person', name: 'Works in Korea?' },
    ...(opts.modified ? { dateModified: opts.modified } : {}),
    keywords: [
      'South Korea',
      'foreigners in Korea',
      'Korean phone verification',
      'foreign card payment',
      'English support',
      'geoblocking',
    ],
    distribution: [
      {
        '@type': 'DataDownload',
        encodingFormat: 'application/json',
        contentUrl: `${opts.url}/api/v1/services.json`,
      },
      {
        '@type': 'DataDownload',
        encodingFormat: 'application/json',
        contentUrl: `${opts.url}/api/v1/changes.json`,
      },
    ],
  };
}
