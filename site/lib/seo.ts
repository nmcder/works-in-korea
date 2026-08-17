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
import { AUTO_KEYS, languageName, viewSignal } from './present';

/**
 * 페이지 맨 위에 놓는 한 문단. **표가 아니라 문장이라야 하는 이유가 있다.**
 *
 * 사람이 구글에 치는 말은 "does kakao t require korean phone number" 같은 문장이고,
 * 검색 결과에 딸려 나오는 미리보기도, 요즘 AI 가 인용해 가는 것도 문장이다.
 * 우리 상세 페이지는 값이 표로만 있어서 뽑아 쓸 문장이 화면에 하나도 없었다.
 * 있던 문장은 메타태그 안에만 있었는데, 그건 사람이 읽는 자리가 아니다.
 *
 * 손으로 쓰지 않는다 — 106개를 손으로 쓰면 값이 바뀌었을 때 문장만 옛말이 된다.
 * **측정값에서 만들어지므로 값이 바뀌면 문장도 같이 바뀐다.**
 * 모르는 항목은 문장에서 통째로 빠진다. 여기서 지어내면 이 사이트가 파는 것이 없어진다.
 */
export function answerSentence(service: Service): { en: string; ko: string } | null {
  const name = service.name.en;

  /*
   * 영어는 조각마다 두 벌을 만든다 — 문단 첫 자리에 올 때와 그 뒤에 올 때.
   * 못 잰 항목은 통째로 빠지므로 어느 조각이 첫 문장이 될지 미리 알 수 없는데,
   * 그렇다고 이름 없이 "The interface is Korean only." 로 시작하면 무슨 서비스
   * 얘기인지 알 수 없는 문단이 된다. 쿠팡이 실제로 그렇게 나왔다 (해외 접속이
   * 봇차단으로 안 재져서 첫 조각이 통째로 빠졌다).
   */
  const en: { lead: string; follow: string }[] = [];
  const ko: string[] = [];
  const add = (lead: string, follow: string, k: string): void => {
    en.push({ lead, follow });
    ko.push(k);
  };

  const val = <T,>(key: Parameters<typeof viewSignal>[1]): T | null => {
    const sig = service.signals[key];
    if (!sig || sig.confidence === 'unknown' || sig.value === null || sig.value === 'unknown') {
      return null;
    }
    return sig.value as T;
  };

  const access = val<string>('overseas_access');
  if (access === 'ok') {
    add(`${name} opens from outside Korea.`, 'It opens from outside Korea.', '해외에서 접속됩니다.');
  } else if (access === 'blocked') {
    add(
      `${name} does not open from outside Korea.`,
      'It does not open from outside Korea.',
      '해외에서는 열리지 않습니다.',
    );
  } else if (access === 'degraded') {
    add(
      `${name} opens from outside Korea, but not everything loads.`,
      'It opens from outside Korea, but not everything loads.',
      '해외에서 열리기는 하지만 일부가 제대로 뜨지 않습니다.',
    );
  }

  /*
   * 한국어는 빼고 나머지만 말한다. "English, Japanese, Korean and Chinese" 처럼
   * 데이터 순서대로 늘어놓으면 한국어가 가운데 끼어 읽기 이상하고, 무엇보다
   * 이 문장을 읽는 사람이 알고 싶은 것은 **한국어 말고 무엇이 되는가** 다.
   */
  const langs = val<string[]>('i18n_ui');
  if (Array.isArray(langs) && langs.length > 0) {
    const others = langs.filter((l) => l !== 'ko');
    if (others.length === 0) {
      add(
        `${name} has a Korean-only interface.`,
        'The interface is Korean only.',
        '화면은 한국어뿐입니다.',
      );
    } else {
      const names = others.map((l) => languageName(l));
      const list = listEn(names.map((n) => n.en));
      const tail = others.includes('en') ? '' : ' — but not in English';
      add(
        `${name} can be used in ${list} as well as Korean${tail}.`,
        `It can also be used in ${list}${tail}.`,
        `화면을 ${names.map((n) => n.ko).join(' · ')}로도 쓸 수 있습니다.`,
      );
    }
  }

  const signup = val<string>('signup_phone_auth');
  if (signup === 'required') {
    add(
      `Signing up for ${name} needs a Korean phone number for identity verification.`,
      'Signing up needs a Korean phone number for identity verification.',
      '가입하려면 한국 휴대폰 본인인증이 필요합니다.',
    );
  } else if (signup === 'any_phone') {
    const body =
      'verifies a phone number, but the form accepts country codes other than +82, so your own number may work.';
    add(
      `Signing up for ${name} ${body}`,
      `Signing up ${body}`,
      '가입할 때 휴대폰 인증을 하지만 +82 말고 다른 국가번호를 고를 수 있습니다.',
    );
  } else if (signup === 'optional') {
    const body = 'does not have to go through a Korean phone — there is another way in.';
    add(
      `Signing up for ${name} ${body}`,
      `Signing up ${body}`,
      '가입에 한국 휴대폰 말고 다른 길이 있습니다.',
    );
  } else if (signup === 'not_required') {
    add(
      `Signing up for ${name} does not ask for phone verification at all.`,
      'Signing up does not ask for phone verification at all.',
      '가입할 때 휴대폰 인증을 아예 요구하지 않습니다.',
    );
  }

  const support = val<string>('support_en');
  if (support === 'yes') {
    add(
      `${name} has a way to get help in English.`,
      'There is a way to get help in English.',
      '영어로 문의할 수 있는 창구가 있습니다.',
    );
  } else if (support === 'no') {
    add(
      `${name} answers customer questions in Korean only.`,
      'Customer support is in Korean only.',
      '고객지원은 한국어뿐입니다.',
    );
  }

  /*
   * 아무것도 못 잰 곳. 빈칸으로 두지 않고 **왜 비었는지**를 쓴다.
   * 그게 이 사이트에서 가장 자주 필요한 문장이다 — 자동 확인이 영구히 막힌 곳이
   * 106곳 중 28곳이고, 그 사실 자체가 방문자에게 쓸모가 있다.
   */
  if (en.length === 0) {
    return {
      en: `${name} blocks automated checks, so the answers here are waiting on people who have actually used it.`,
      ko: `${service.name.ko} — 자동 확인을 막아 두어서, 실제로 써 본 사람의 제보를 기다리고 있습니다.`,
    };
  }

  const sentences = en.map((c, i) => (i === 0 ? c.lead : c.follow));
  // 한국어는 이름 뒤에 조사를 붙이면 받침 규칙을 타므로 줄표로 끊는다.
  return { en: sentences.join(' '), ko: `${service.name.ko} — ${ko.join(' ')}` };
}

/** a, b and c */
function listEn(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;
}

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

/**
 * 서비스 상세 = 질문과 답의 목록. 그대로 FAQPage 다.
 *
 * ── 왜 url 하나로 부족한가
 *
 * 전에는 `{ @type: FAQPage, url, mainEntity }` 뿐이었다. 질문과 답은 있는데
 * **이 페이지가 무엇에 대한 것이고 누가 언제 잰 것인지**가 없었다. 기계 입장에서
 * "Kakao T" 라는 이름과 이 주소가 한 묶음이라는 선언이 어디에도 없었던 것이다.
 * 이름은 제목·본문·API·llms.txt 에 다 있었지만, 묶어 주는 자리에만 없었다.
 *
 * 그래서 네 가지를 더 붙인다.
 *   name              이 페이지의 이름 — 이름과 주소를 한 묶음으로 만든다
 *   dateModified      마지막으로 잰 시각. 인용하는 쪽이 날짜를 붙일 수 있게 한다
 *   about             재는 대상(그 회사 사이트). 우리와 그 회사를 구분해 준다
 *   publisher / isPartOf   잰 주체가 우리라는 것. 출처 표기의 근거다
 *
 * `about` 이 특히 중요하다. 이게 없으면 이 페이지의 주인공이 카카오모빌리티인지
 * 우리인지 기계가 알 길이 없고, 그 혼동이 그대로 "출처: kakaomobility.com" 이 된다.
 */
export function serviceFaq(
  service: Service,
  url: string,
  site: { url: string; name: string },
): unknown {
  const views = AUTO_KEYS.map((k) => viewSignal(service, k)).filter((v) => v.tone !== 'none');

  /*
   * 답 하나하나가 **스스로 어디서 왔고 언제 잰 것인지** 말하게 한다.
   *
   * 처음에는 답마다 페이지 주소를 그냥 붙였는데, 그러면 여섯 개의 답이 전부 같은
   * 주소를 가리키고 날짜는 페이지 하나에 하나뿐이었다. 그 날짜는 여섯 값 중 가장
   * 최근 것이라, 답 하나를 떼어 인용하는 쪽은 **재지도 않은 날짜를 그 값에 붙이게**
   * 된다. 106곳 중 51곳이 시그널마다 측정일이 다르고 쿠팡은 사흘에 걸쳐 있다.
   * 측정하지 않은 날짜를 값에 붙이는 것은 이 프로젝트가 하지 않기로 한 바로 그 일이다.
   *
   * 그래서 답마다 앵커 주소와 그 값의 측정일을 따로 단다. 어떻게 쟀는지도 한 마디
   * 붙인다 — 값·시각·방법 세 가지를 같이 낸다는 규칙이 여기라고 예외일 이유가 없다.
   */
  const provenance = (v: (typeof views)[number]): string => {
    if (!v.measuredAt) return '';
    const day = v.measuredAt.slice(0, 10);
    const how =
      v.confidence === 'manual'
        ? 'Checked by hand'
        : v.confidence === 'community'
          ? 'Reported by someone who used it'
          : v.confidence === 'conflicting'
            ? 'Reports disagree; last checked'
            : 'Measured automatically from outside Korea';
    return ` ${how} on ${day}.`;
  };

  const entries = views.map((v) => ({
    '@type': 'Question',
    name: `${service.name.en}: ${v.question.en}`,
    acceptedAnswer: {
      '@type': 'Answer',
      text: `${v.caveat ? `${v.display.en}. ${v.caveat.en}` : v.display.en}.${provenance(v)}`,
      url: `${url}#${v.key}`,
      ...(v.measuredAt ? { dateModified: v.measuredAt } : {}),
    },
  }));

  if (entries.length === 0) return null;

  const measured = views
    .map((v) => v.measuredAt)
    .filter((t): t is string => Boolean(t))
    .sort()
    .at(-1);

  const langs = service.signals.i18n_ui?.value;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': url,
    url,
    name: `${service.name.en} (${service.name.ko}) — does it work for foreigners?`,
    description: serviceDescription(service),
    inLanguage: 'en',
    ...(measured ? { dateModified: measured } : {}),
    license: 'https://creativecommons.org/licenses/by/4.0/',
    isPartOf: { '@type': 'WebSite', name: site.name, url: site.url },
    publisher: { '@type': 'Organization', name: site.name, url: site.url },
    // 재는 대상이지 우리가 아니다. 이 구분이 없으면 출처가 저쪽으로 새어 나간다.
    about: {
      '@type': 'WebSite',
      name: `${service.name.en} (${service.name.ko})`,
      url: service.url,
      ...(Array.isArray(langs) && langs.length > 0 ? { inLanguage: langs } : {}),
    },
    mainEntity: entries,
  };
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
    /*
     * publisher 와 같은 이름·같은 주소여야 한다. 전에는 여기는 Person, 서비스
     * 페이지는 Organization 이고 여기에만 url 이 없었다. 기계 입장에서 이름만 같은
     * 남남 둘이 되고, 그러면 이 데이터셋과 그 페이지들을 같은 곳이 낸 것으로 묶지 못한다.
     */
    creator: { '@type': 'Organization', name: 'Works in Korea?', url: opts.url },
    publisher: { '@type': 'Organization', name: 'Works in Korea?', url: opts.url },
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
