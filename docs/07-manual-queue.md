# 손으로 확인할 것

`npm run manual-queue` 가 생성. 남은 57곳 · 1묶음.

각 묶음을 `docs/08-manual-prompt.md` 의 프롬프트와 함께 코워크에 준다.
답을 받으면 `npm run ingest-manual -- --file=<답.json>` 으로 넣는다.

## `signup_phone_auth` — 가입할 때 한국 휴대폰 본인인증이 필요한가

**보는 법** 가입 페이지를 열고 **양식만 읽는다.** 계정을 만들지 않는다. 통신사 선택(SKT·KT·LG U+), "휴대폰 본인인증", "본인확인", PASS 앱, 아이핀 같은 것이 보이는지 본다.

**답** required = 한국 번호(010) 인증 말고는 길이 없음 / any_phone = 인증은 하지만 국가번호를 +82 말고 다른 것도 고를 수 있음 / optional = 이메일·소셜 등 다른 길이 함께 있음 / not_required = 인증 요구가 아예 없음 / unknown = 확실하지 않음

## `i18n_ui` — 어떤 언어로 쓸 수 있는가

**보는 법** 첫 화면에서 언어 전환 버튼(보통 우측 상단, KO/EN, 지구본 모양)을 찾는다. 눌러서 실제로 그 언어로 바뀌는지 본다. **자동 번역은 세지 않는다** — 사이트가 스스로 제공하는 것만.

**답** ["ko"] 또는 ["ko","en"] 처럼 실제로 고를 수 있는 언어 코드 배열 / 확실하지 않으면 null

## `support_en` — 영어로 고객지원을 받을 수 있는가

**보는 법** 고객센터·FAQ·문의 페이지를 연다. 영어 안내나 영어 문의 창구가 있는지 본다.

**답** yes = 영어 안내나 영어 문의 창구가 실제로 있음 / no = 한국어뿐임을 확인함 / unknown = 고객센터를 못 찾았거나 확실하지 않음

---

## 묶음 1 / 1

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
    "service_id": "baemin",
    "name": "Baemin",
    "url": "https://www.baemin.com",
    "check": [
      "i18n_ui"
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
    "service_id": "auction",
    "name": "Auction",
    "url": "https://www.auction.co.kr",
    "check": [
      "i18n_ui"
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
    "service_id": "woori-bank",
    "name": "Woori Bank",
    "url": "https://www.wooribank.com",
    "check": [
      "signup_phone_auth"
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
    "service_id": "cjonstyle",
    "name": "CJ ONSTYLE",
    "url": "https://www.cjonstyle.com",
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

