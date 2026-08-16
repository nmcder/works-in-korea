<!-- 이 파일 전체를 복사해서 코워크에 그대로 붙여넣으면 된다. 잘라낼 것 없음. -->
<!-- npm run manual-queue 가 다시 만든다. 직접 고치지 말 것 — 프롬프트는 08 에 있다. -->


> 아래는 원본이다. 실제로 줄 때는 `docs/queue/all.md` 를 쓴다 — 여기를 고치면
> 다음 `npm run manual-queue` 때 그 파일에 반영된다.

당신은 한국 온라인 서비스를 **직접 열어 보고** 세 가지 사실을 확인하는 일을 맡았습니다.
결과는 공개 데이터베이스에 실리고, 한국에 막 온 외국인이 그걸 보고 판단합니다.

### 가장 중요한 규칙

**모르면 `unknown` 이라고 답하세요. 그게 정답입니다.**

이 프로젝트는 "모른다고 말하는 것"을 가장 큰 자산으로 여깁니다. 틀린 답 하나가
빈칸 열 개보다 나쁩니다. 빈칸은 사람이 채우면 되지만, 틀린 답은 그걸 믿은 사람을
공항에서, 병원에서, 결제창 앞에서 멈춰 세웁니다.

그럴듯하게 지어내지 마세요. **일반적으로 그럴 것 같다는 지식으로 답하지 마세요.**
당신이 방금 그 화면에서 본 것만 답하세요. 화면을 못 열었으면 `unknown` 입니다.

### 시작하기 전에 — 로그인이 안 된 창에서 하세요

**시크릿 창이나 계정이 하나도 로그인되지 않은 새 프로필에서 시작하세요.**

이게 규칙 중에 제일 중요합니다. 이 데이터가 답하려는 질문은 **"한국에 막 온 외국인이
보는 화면"** 인데, 브라우저에 카카오나 네이버 계정이 로그인돼 있으면 당신이 보는 것은
"한국인 기존 회원이 보는 화면"입니다. 그러면 답이 통째로 틀립니다.

특히 이미 로그인돼 있으면 **가입 흐름을 아예 못 봅니다** — 가입 버튼을 눌러도 그냥
로그인된 상태로 들어가 버립니다. 2026-08-16 첫 시도에서 실제로 그렇게 됐습니다.

시작 전에 확인하세요: 아무 한국 사이트나 열었을 때 내 이름이나 프로필이 보이면
잘못된 창입니다.

### 하면 안 되는 것

- **로그인하지 마세요.** 자동으로 로그인되면 그 즉시 멈추고 그 서비스는 `unknown` 으로 두세요.
- **계정을 만들지 마세요.** 가입 양식은 *읽기만* 합니다. 제출 버튼을 누르지 않습니다.
- **결제를 시도하지 마세요.** 카드 번호를 넣지 않습니다.
- 같은 사이트에 빠르게 반복 요청하지 마세요.

### 확인할 세 가지

#### 1. `signup_phone_auth` — 가입할 때 한국 휴대폰 본인인증이 필요한가

가입 페이지를 열고 **양식을 읽습니다.** 이런 것이 보이는지 봅니다:

- 통신사 선택 (SKT · KT · LG U+ · 알뜰폰)
- "휴대폰 본인인증", "본인확인", "실명확인"
- PASS 앱, 아이핀(i-PIN), 카카오 인증서, 네이버 인증서
- 주민등록번호 / 외국인등록번호 입력란

| 답 | 언제 |
|---|---|
| `required` | 한국 번호(010) 인증 말고는 길이 없음 |
| `any_phone` | 휴대폰 인증은 하는데 **국가번호를 +82 말고 다른 것도 고를 수 있음** |
| `optional` | 이메일·구글·애플 같은 다른 길이 **함께** 있음 |
| `not_required` | 인증 요구가 아예 없음 (이메일만으로 끝남) |
| `unknown` | 가입 페이지를 못 찾았거나, 열렸는데 확실하지 않음 |

**⚠️ `any_phone` 을 꼭 봐 주세요. 이 데이터에서 제일 중요한 구분입니다.**

휴대폰 인증 화면이 나왔을 때 **국가번호 선택 칸이 있는지** 확인하세요.

- `+82` 만 있거나, 입력칸이 `010-0000-0000` 형식으로 고정 → **`required`** (진짜로 막힘)
- `+1`, `+81`, `+63` 같은 다른 나라를 고를 수 있음 → **`any_phone`** (본국 번호로 됨)

카카오 계정이 후자이고 야놀자·캐치테이블이 전자입니다. 화면만 보면 둘 다 "휴대폰
인증"이라 똑같아 보이는데, 외국인에게는 **쓸 수 있다와 없다만큼 다릅니다.**

> 가입 버튼을 눌렀더니 "회원 유형 선택" 같은 중간 화면만 나오고 실제 입력란을
> 못 봤다면 **`unknown`** 입니다. 그 다음 화면에 인증이 있을 수 있습니다.

**⚠️ 소셜 로그인 단추가 있다고 `optional` 이 아닙니다.**

카카오·네이버 계정은 **그 자체가 한국 휴대폰을 요구합니다.** 그러니 "카카오로 시작하기"가
있다는 것은 외국인에게 아무 탈출구가 아닙니다. 한국 휴대폰이 없는 사람에게 실제로 길이
되는 것은 이런 것들입니다:

- Apple · Google · Facebook 로그인
- 이메일 + 비밀번호
- 여권이나 외국인등록증으로 대신하는 경로

그리고 **그 길이 실제로 가입을 끝내는지 확인해야 합니다.** 단추만 보고 판단하지 마세요 —
누르면 그다음에 휴대폰 인증을 다시 요구하는 곳이 많습니다. 거기까지 못 봤으면 `unknown`.

또한 **로그인 화면과 가입 화면은 다릅니다.** 로그인 화면만 보고 가입 조건을 답하지 마세요.

#### 2. `i18n_ui` — 어떤 언어로 쓸 수 있는가

첫 화면에서 언어 전환을 찾습니다. 보통 우측 상단에 `KO/EN`, 지구본 모양,
또는 `Language` 메뉴가 있습니다. **눌러서 실제로 그 언어로 바뀌는지 확인합니다.**

- 브라우저 자동 번역은 **세지 않습니다.** 사이트가 스스로 제공하는 것만입니다.
- 영어 페이지가 따로 있는데 링크가 있으면 셉니다.
- 메뉴 몇 개만 영어인 것은 세지 않습니다.

답은 언어 코드 배열입니다: `["ko"]` · `["ko","en"]` · `["ko","en","zh","ja"]`
(`ko` 한국어 · `en` 영어 · `ja` 일본어 · `zh` 중국어 · `vi` 베트남어 · `th` 태국어)

확실하지 않으면 `null`.

#### 3. `support_en` — 영어로 고객지원을 받을 수 있는가

고객센터 · FAQ · 문의 페이지를 엽니다.

| 답 | 언제 |
|---|---|
| `yes` | 영어 FAQ나 영어 문의 창구가 **실제로 있는 것을 봄** |
| `no` | 고객센터를 열었고 한국어뿐인 것을 확인함 |
| `unknown` | 고객센터를 못 찾았거나 확실하지 않음 |

### 답 형식

**JSON 배열 하나만** 출력하세요. 설명은 붙이지 마세요.

```json
[
  {
    "service_id": "coupang",
    "checked_at": "2026-08-16",
    "signup_phone_auth": {
      "value": "required",
      "url": "https://login.coupang.com/login/memberJoinProcess.pang",
      "saw": "가입 첫 단계에 '휴대폰 본인인증' 버튼만 있고 통신사 선택(SKT/KT/LGU+)이 나온다. 이메일로 가입하는 길은 보이지 않았다."
    },
    "i18n_ui": {
      "value": ["ko"],
      "url": "https://www.coupang.com",
      "saw": "우측 상단과 하단 어디에도 언어 전환이 없다. 전부 한국어."
    },
    "support_en": {
      "value": "unknown",
      "url": "",
      "saw": ""
    }
  }
]
```

### 실제로 걸렸던 네 가지 — 전부 되돌려야 했습니다

**1. "없다"를 홈페이지만 보고 단정하지 마세요.**

`support_en: "no"` 는 "고객센터를 **열어 봤고** 한국어뿐이더라"일 때만 씁니다.
첫 화면에 언어 전환 버튼이 없는 것은 고객센터에 영어가 없다는 뜻이 아닙니다.
실제로 다음(Daum)을 그렇게 판정했는데, 다음은 카카오 서비스이고 카카오 고객센터
(cs.kakao.com)에는 영어가 있습니다. 같은 묶음에서 카카오톡은 `yes` 로 나왔는데
다음만 `no` 가 된 이유가 이것입니다. 고객센터를 못 찾았으면 `unknown` 입니다.

**2. 다른 언어가 보이는데 확인을 못 했으면 `["ko"]` 가 아니라 `null` 입니다.**

"영어·일본어·중국어 링크가 있었지만 눌러서 확인하지는 못했다" → 답은 `null`(모름)입니다.
`["ko"]` 는 **"한국어뿐인 것을 확인했다"** 는 뜻이고 화면에 빨간색 "한국어만"으로
나갑니다. 못 본 것을 없다고 발표하는 셈입니다.

**3. 약관·개인정보처리방침은 가입 화면이 아닙니다.**

"개인정보처리방침에 휴대폰번호가 수집항목으로 적혀 있다"는 그 서비스가 언젠가
전화번호를 받는다는 뜻이지, **가입할 때 반드시 필요하다**는 뜻이 아닙니다.
가입 화면을 열지 못했으면 `unknown` 입니다. 도움말 문서가 가입 절차를 단계별로
설명하고 있다면 그건 근거로 쓸 수 있지만, `saw` 에 그 문서를 봤다고 밝히세요.

**4. 필수 입력란과 본인인증은 다르지만, 답은 같을 수 있습니다.**

"휴대폰번호가 필수 칸(*)인데 인증번호 발송 버튼은 없다" → 인증은 없지만
**한국 번호 없이는 그 칸을 채울 수 없습니다.** 우리가 묻는 것은 "한국 휴대폰이
필요한가"이므로 이건 `not_required` 가 아닙니다. 확실하지 않으면 `unknown`.

### `saw` 칸이 이 일의 핵심입니다

**화면에서 본 것을 그대로 적으세요.** 판단이 아니라 관찰입니다.

| | |
|---|---|
| ❌ | `"확인함"` · `"본인인증 필요함"` · `"영어 지원됨"` |
| ⭕ | `"우측 상단에 KO/EN 전환 버튼이 있고, EN 을 누르니 메뉴와 상품명이 영어로 바뀌었다"` |
| ⭕ | `"고객센터 페이지 상단에 English 탭이 있고 FAQ 12개가 영어로 적혀 있다"` |
| ⭕ | `"가입 페이지에 이메일·비밀번호 입력란만 있고 인증 관련 항목이 없다"` |

`saw` 가 12자보다 짧거나 관찰이 아니면 **기록되지 않고 거절됩니다.**
`unknown` 으로 답할 때는 `url` 과 `saw` 를 빈 문자열로 두면 됩니다.

### 확인할 목록

```json
[
  {
    "service_id": "11st",
    "name": "11st",
    "url": "https://www.11st.co.kr",
    "check": [
      "signup_phone_auth",
      "i18n_ui",
      "support_en"
    ]
  },
  {
    "service_id": "coupang",
    "name": "Coupang",
    "url": "https://www.coupang.com",
    "signup_url": "https://login.coupang.com/login/login.pang",
    "support_url": "https://mc.coupang.com/ssr/desktop/contact/faq",
    "check": [
      "signup_phone_auth",
      "i18n_ui",
      "support_en"
    ]
  },
  {
    "service_id": "naver-booking",
    "name": "Naver Booking",
    "url": "https://booking.naver.com",
    "check": [
      "signup_phone_auth",
      "i18n_ui",
      "support_en"
    ]
  },
  {
    "service_id": "naver-map",
    "name": "Naver Map",
    "url": "https://map.naver.com",
    "signup_url": "https://nid.naver.com/nidlogin.login?url=https%3A%2F%2Fmap.naver.com%2F",
    "support_url": "https://help.naver.com/service/5637/category/bookmark",
    "check": [
      "signup_phone_auth",
      "i18n_ui",
      "support_en"
    ]
  },
  {
    "service_id": "naver-shopping",
    "name": "Naver Shopping",
    "url": "https://shopping.naver.com",
    "check": [
      "signup_phone_auth",
      "i18n_ui",
      "support_en"
    ]
  },
  {
    "service_id": "baemin",
    "name": "Baemin",
    "url": "https://www.baemin.com",
    "check": [
      "signup_phone_auth",
      "i18n_ui"
    ]
  },
  {
    "service_id": "coupang-eats",
    "name": "Coupang Eats",
    "url": "https://www.coupangeats.com",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  },
  {
    "service_id": "kakao-t",
    "name": "Kakao T",
    "url": "https://www.kakaomobility.com",
    "support_url": "https://www.kakaomobility.com/customer-support",
    "check": [
      "signup_phone_auth",
      "i18n_ui"
    ]
  },
  {
    "service_id": "kakaopay",
    "name": "KakaoPay",
    "url": "https://www.kakaopay.com",
    "support_url": "https://support.kakaopay.com/web/faq-list/all",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  },
  {
    "service_id": "naver",
    "name": "Naver",
    "url": "https://www.naver.com",
    "signup_url": "https://nid.naver.com/account/signup/term",
    "support_url": "https://help.naver.com/service/5627/contents/9148?lang=ko",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  },
  {
    "service_id": "naverpay",
    "name": "Naver Pay",
    "url": "https://pay.naver.com",
    "support_url": "https://help.naver.com/service/5640/category/bookmark?lang=ko",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  },
  {
    "service_id": "toss",
    "name": "Toss",
    "url": "https://toss.im",
    "support_url": "https://support.toss.im/",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  },
  {
    "service_id": "catchtable",
    "name": "CatchTable",
    "url": "https://www.catchtable.co.kr",
    "check": [
      "i18n_ui"
    ]
  },
  {
    "service_id": "cgv",
    "name": "CGV",
    "url": "http://www.cgv.co.kr",
    "signup_url": "https://www.cjone.com/cjmweb/join.do?coopco_cd=7010&brnd_cd=1000&mcht_no=1000&coop_return_url=https%3A%2F%2Fcgv.co.kr",
    "check": [
      "i18n_ui"
    ]
  },
  {
    "service_id": "goodchoice",
    "name": "GoodChoice (Yeogi Eottae)",
    "url": "https://www.yeogi.com",
    "signup_url": "https://platform.yeogi.com/login?redirectUri=https://www.yeogi.com/",
    "support_url": "https://www.yeogi.com/faq",
    "check": [
      "i18n_ui"
    ]
  },
  {
    "service_id": "kakao-gift",
    "name": "Kakao Gift",
    "url": "https://gift.kakao.com",
    "check": [
      "signup_phone_auth"
    ]
  },
  {
    "service_id": "kakaobank",
    "name": "KakaoBank",
    "url": "https://www.kakaobank.com",
    "check": [
      "signup_phone_auth"
    ]
  },
  {
    "service_id": "kakaotalk",
    "name": "KakaoTalk",
    "url": "https://www.kakaocorp.com",
    "support_url": "https://cs.kakao.com/",
    "check": [
      "signup_phone_auth"
    ]
  },
  {
    "service_id": "kbstar",
    "name": "KB Kookmin Bank",
    "url": "https://www.kbstar.com",
    "signup_url": "https://obank.kbstar.com/quics?page=C055068&QSL=F",
    "check": [
      "signup_phone_auth"
    ]
  },
  {
    "service_id": "kobus",
    "name": "Kobus (Express Bus)",
    "url": "https://www.kobus.co.kr",
    "signup_url": "https://www.kobus.co.kr/mbrs/mbrsjoin/mbrsJoin.do",
    "check": [
      "signup_phone_auth"
    ]
  },
  {
    "service_id": "shinhan-bank",
    "name": "Shinhan Bank",
    "url": "https://bank.shinhan.com",
    "signup_url": "https://www.shinhan.com/hpe/index.jsp#050601000000",
    "support_url": "https://www.shinhan.com/hpe/index.jsp",
    "check": [
      "i18n_ui"
    ]
  },
  {
    "service_id": "yanolja",
    "name": "Yanolja",
    "url": "https://www.yanolja.com",
    "signup_url": "https://accounts.yanolja.com/v3/login",
    "support_url": "https://ad.yanolja.com/intro",
    "check": [
      "i18n_ui"
    ]
  },
  {
    "service_id": "yogiyo",
    "name": "Yogiyo",
    "url": "https://www.yogiyo.co.kr",
    "signup_url": "https://www.yogiyo.co.kr/mobile/#/login/",
    "support_url": "https://www.yogiyo.co.kr",
    "check": [
      "i18n_ui"
    ]
  },
  {
    "service_id": "ssg",
    "name": "SSG.COM",
    "url": "https://www.ssg.com",
    "check": [
      "signup_phone_auth",
      "i18n_ui",
      "support_en"
    ]
  },
  {
    "service_id": "auction",
    "name": "Auction",
    "url": "https://www.auction.co.kr",
    "check": [
      "signup_phone_auth",
      "i18n_ui"
    ]
  },
  {
    "service_id": "melon",
    "name": "Melon",
    "url": "https://www.melon.com",
    "check": [
      "signup_phone_auth",
      "i18n_ui"
    ]
  },
  {
    "service_id": "nonghyup",
    "name": "NH Nonghyup Bank",
    "url": "https://banking.nonghyup.com",
    "support_url": "https://banking.nonghyup.com/servlet/content/ip/ec/IPEC0001M.thtml",
    "check": [
      "signup_phone_auth",
      "i18n_ui"
    ]
  },
  {
    "service_id": "tmap",
    "name": "TMAP",
    "url": "https://www.tmap.co.kr",
    "support_url": "https://www.tmapmobility.com/support/data",
    "check": [
      "signup_phone_auth",
      "i18n_ui"
    ]
  },
  {
    "service_id": "tossbank",
    "name": "Toss Bank",
    "url": "https://www.tossbank.com",
    "support_url": "https://www.tossbank.com/customer/information/privacy/privacy-policy",
    "check": [
      "signup_phone_auth",
      "i18n_ui"
    ]
  },
  {
    "service_id": "tving",
    "name": "TVING",
    "url": "https://www.tving.com",
    "support_url": "https://www.tving.com/help/notice",
    "check": [
      "signup_phone_auth",
      "i18n_ui"
    ]
  },
  {
    "service_id": "woori-bank",
    "name": "Woori Bank",
    "url": "https://www.wooribank.com",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  },
  {
    "service_id": "daangn",
    "name": "Karrot (Danggeun Market)",
    "url": "https://www.daangn.com",
    "support_url": "https://daangn.com/wv/faqs",
    "check": [
      "signup_phone_auth"
    ]
  },
  {
    "service_id": "daum",
    "name": "Daum",
    "url": "https://www.daum.net",
    "support_url": "https://cs.daum.net/",
    "check": [
      "i18n_ui"
    ]
  },
  {
    "service_id": "gmoneytrans",
    "name": "GME Remittance",
    "url": "https://www.gmoneytrans.com",
    "support_url": "https://gmoneytrans.com/supported-countries/",
    "check": [
      "signup_phone_auth"
    ]
  },
  {
    "service_id": "hana-bank",
    "name": "Hana Bank",
    "url": "https://www.kebhana.com",
    "check": [
      "signup_phone_auth"
    ]
  },
  {
    "service_id": "hanpass",
    "name": "Hanpass",
    "url": "https://www.hanpass.com",
    "support_url": "https://www.hanpass.com/en/cs",
    "check": [
      "signup_phone_auth"
    ]
  },
  {
    "service_id": "hira",
    "name": "HIRA",
    "url": "https://www.hira.or.kr",
    "support_url": "https://www.hira.or.kr/bbsDummy.do?pgmid=HIRAA010006011020&amp;WT.gnb=%EC%83%81%EB%8B%B4%EB%AC%B8%EC%9D%98",
    "check": [
      "signup_phone_auth"
    ]
  },
  {
    "service_id": "ktmmobile",
    "name": "KT M mobile",
    "url": "https://www.ktmmobile.com",
    "signup_url": "https://www.ktmmobile.com/appForm/withoutUsim.do",
    "support_url": "https://www.ktmmobile.com/cs/serviceGuide.do",
    "check": [
      "i18n_ui"
    ]
  },
  {
    "service_id": "kurly",
    "name": "Market Kurly",
    "url": "https://www.kurly.com",
    "support_url": "https://docs.google.com/forms/d/e/1FAIpQLScWcjRuN6eWJK-G8x3NwBfE8IyKZIOq7jhD3fUXuKSWwPqzJw/viewform",
    "check": [
      "i18n_ui"
    ]
  },
  {
    "service_id": "lotteon",
    "name": "Lotte ON",
    "url": "https://www.lotteon.com",
    "check": [
      "signup_phone_auth"
    ]
  },
  {
    "service_id": "seoul-global",
    "name": "Seoul Global Center",
    "url": "https://global.seoul.go.kr",
    "support_url": "https://global.seoul.go.kr/web/prmg/prco/prcoListPage.do",
    "check": [
      "signup_phone_auth"
    ]
  },
  {
    "service_id": "severance",
    "name": "Severance Hospital",
    "url": "https://sev.severance.healthcare",
    "support_url": "https://sev.severance.healthcare/sev/patient-carer/appointment/checkup/faq.do",
    "check": [
      "i18n_ui"
    ]
  },
  {
    "service_id": "sk7mobile",
    "name": "SK 7mobile",
    "url": "https://www.sk7mobile.com",
    "support_url": "https://www.sk7mobile.com/util/support/deviceChange.do?refer=mognb",
    "check": [
      "i18n_ui"
    ]
  },
  {
    "service_id": "tmoney",
    "name": "T-money",
    "url": "https://www.t-money.co.kr",
    "check": [
      "signup_phone_auth"
    ]
  },
  {
    "service_id": "travel-wallet",
    "name": "Travel Wallet",
    "url": "https://www.travel-wallet.com",
    "support_url": "https://enterprise.travel-wallet.com/home",
    "check": [
      "signup_phone_auth"
    ]
  },
  {
    "service_id": "txbus",
    "name": "Txbus (Intercity Bus)",
    "url": "https://txbus.t-money.co.kr",
    "check": [
      "support_en"
    ]
  },
  {
    "service_id": "wavve",
    "name": "Wavve",
    "url": "https://www.wavve.com",
    "support_url": "https://www.wavve.com/customer/notice_list",
    "check": [
      "i18n_ui"
    ]
  },
  {
    "service_id": "ibk",
    "name": "IBK Industrial Bank",
    "url": "https://www.ibk.co.kr",
    "check": [
      "signup_phone_auth",
      "i18n_ui",
      "support_en"
    ]
  },
  {
    "service_id": "seoul-metro",
    "name": "Seoul Metro",
    "url": "https://www.seoulmetro.co.kr",
    "check": [
      "signup_phone_auth",
      "i18n_ui",
      "support_en"
    ]
  },
  {
    "service_id": "cjonstyle",
    "name": "CJ ONSTYLE",
    "url": "https://www.cjonstyle.com",
    "check": [
      "signup_phone_auth",
      "i18n_ui"
    ]
  },
  {
    "service_id": "gsshop",
    "name": "GS Shop",
    "url": "https://www.gsshop.com",
    "check": [
      "signup_phone_auth",
      "i18n_ui"
    ]
  },
  {
    "service_id": "kbank",
    "name": "K bank",
    "url": "https://www.kbanknow.com",
    "support_url": "https://www.kbanknow.com/web/customer/faq/list",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  },
  {
    "service_id": "tada",
    "name": "TADA",
    "url": "https://tadatada.com",
    "support_url": "https://www.tadatada.com/ad-biz",
    "check": [
      "signup_phone_auth",
      "i18n_ui"
    ]
  },
  {
    "service_id": "ably",
    "name": "Ably",
    "url": "https://a-bly.com",
    "check": [
      "i18n_ui"
    ]
  },
  {
    "service_id": "danawa",
    "name": "Danawa",
    "url": "https://www.danawa.com",
    "support_url": "https://help.danawa.com/",
    "check": [
      "i18n_ui"
    ]
  },
  {
    "service_id": "ddocdoc",
    "name": "DdocDoc",
    "url": "https://www.ddocdoc.com",
    "signup_url": "https://hospital.ddocdoc.com/register?utm_source=ddocdoc-com&amp;utm_medium=bottom-list&amp;utm_campaign=etc",
    "check": [
      "i18n_ui"
    ]
  },
  {
    "service_id": "goodoc",
    "name": "Goodoc",
    "url": "https://www.goodoc.co.kr",
    "support_url": "https://www.goodoc.co.kr",
    "check": [
      "i18n_ui"
    ]
  },
  {
    "service_id": "hanatour",
    "name": "Hana Tour",
    "url": "https://www.hanatour.com",
    "check": [
      "i18n_ui"
    ]
  },
  {
    "service_id": "modetour",
    "name": "Mode Tour",
    "url": "https://www.modetour.com",
    "support_url": "https://www.modetour.com/customer-center",
    "check": [
      "i18n_ui"
    ]
  },
  {
    "service_id": "payco",
    "name": "PAYCO",
    "url": "https://www.payco.com",
    "signup_url": "https://membership.payco.com/",
    "support_url": "https://www.payco.com/cs/faq.nhn",
    "check": [
      "i18n_ui"
    ]
  },
  {
    "service_id": "ridibooks",
    "name": "RIDI Books",
    "url": "https://ridibooks.com",
    "support_url": "https://ridihelp.ridibooks.com/support/home",
    "check": [
      "signup_phone_auth"
    ]
  },
  {
    "service_id": "zigzag",
    "name": "Zigzag",
    "url": "https://zigzag.kr",
    "support_url": "https://zigzag.kr",
    "check": [
      "i18n_ui"
    ]
  }
]
```

각 항목의 `check` 배열에 있는 것만 확인하면 됩니다. 이미 값이 있는 것은
빠져 있으므로 다시 볼 필요가 없습니다.

`signup_url` 과 `support_url` 이 적혀 있으면 그 주소부터 열어 보세요.
없으면 `url` 에서 직접 찾아야 합니다 — 찾다가 못 찾으면 `unknown` 입니다.

