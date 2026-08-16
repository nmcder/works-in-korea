# 손으로 확인할 것

`npm run manual-queue` 가 생성. 남은 98곳 · 9묶음.

각 묶음을 `docs/08-manual-prompt.md` 의 프롬프트와 함께 코워크에 준다.
답을 받으면 `npm run ingest-manual -- --file=<답.json>` 으로 넣는다.

## `signup_phone_auth` — 가입할 때 한국 휴대폰 본인인증이 필요한가

**보는 법** 가입 페이지를 열고 **양식만 읽는다.** 계정을 만들지 않는다. 통신사 선택(SKT·KT·LG U+), "휴대폰 본인인증", "본인확인", PASS 앱, 아이핀 같은 것이 보이는지 본다.

**답** required = 한국 휴대폰 인증 말고는 길이 없음 / optional = 이메일·소셜 등 다른 길이 함께 있음 / not_required = 인증 요구가 아예 없음 / unknown = 가입 페이지를 못 찾았거나 확실하지 않음

## `i18n_ui` — 어떤 언어로 쓸 수 있는가

**보는 법** 첫 화면에서 언어 전환 버튼(보통 우측 상단, KO/EN, 지구본 모양)을 찾는다. 눌러서 실제로 그 언어로 바뀌는지 본다. **자동 번역은 세지 않는다** — 사이트가 스스로 제공하는 것만.

**답** ["ko"] 또는 ["ko","en"] 처럼 실제로 고를 수 있는 언어 코드 배열 / 확실하지 않으면 null

## `support_en` — 영어로 고객지원을 받을 수 있는가

**보는 법** 고객센터·FAQ·문의 페이지를 연다. 영어 안내나 영어 문의 창구가 있는지 본다.

**답** yes = 영어 안내나 영어 문의 창구가 실제로 있음 / no = 한국어뿐임을 확인함 / unknown = 고객센터를 못 찾았거나 확실하지 않음

---

## 묶음 1 / 9

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
    "service_id": "baemin",
    "name": "Baemin",
    "url": "https://www.baemin.com",
    "check": [
      "signup_phone_auth",
      "i18n_ui",
      "support_en"
    ]
  },
  {
    "service_id": "catchtable",
    "name": "CatchTable",
    "url": "https://www.catchtable.co.kr",
    "check": [
      "signup_phone_auth",
      "i18n_ui",
      "support_en"
    ]
  },
  {
    "service_id": "cgv",
    "name": "CGV",
    "url": "http://www.cgv.co.kr",
    "signup_url": "https://www.cjone.com/cjmweb/join.do?coopco_cd=7010&brnd_cd=1000&mcht_no=1000&coop_return_url=https%3A%2F%2Fcgv.co.kr",
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
    "service_id": "coupang-eats",
    "name": "Coupang Eats",
    "url": "https://www.coupangeats.com",
    "check": [
      "signup_phone_auth",
      "i18n_ui",
      "support_en"
    ]
  },
  {
    "service_id": "e-gen",
    "name": "Emergency Medical Portal (E-Gen)",
    "url": "https://www.e-gen.or.kr",
    "check": [
      "signup_phone_auth",
      "i18n_ui",
      "support_en"
    ]
  },
  {
    "service_id": "gov-kr",
    "name": "Government24",
    "url": "https://www.gov.kr",
    "signup_url": "https://plus.gov.kr/member/signUpAgree",
    "check": [
      "signup_phone_auth",
      "i18n_ui",
      "support_en"
    ]
  },
  {
    "service_id": "hikorea",
    "name": "HiKorea (Immigration)",
    "url": "https://www.hikorea.go.kr",
    "signup_url": "https://www.hikorea.go.kr/memb/stipDetailRM.pt",
    "check": [
      "signup_phone_auth",
      "i18n_ui",
      "support_en"
    ]
  },
  {
    "service_id": "hometax",
    "name": "Hometax (NTS)",
    "url": "https://www.hometax.go.kr",
    "signup_url": "https://hometax.go.kr/websquare/websquare.html?w2xPath=/ui/pp/index_pp.xml&menuCd=UTXPPAAA80",
    "check": [
      "signup_phone_auth",
      "i18n_ui",
      "support_en"
    ]
  },
  {
    "service_id": "interpark-ticket",
    "name": "Interpark Ticket",
    "url": "https://tickets.interpark.com",
    "check": [
      "signup_phone_auth",
      "i18n_ui",
      "support_en"
    ]
  },
  {
    "service_id": "kakao-gift",
    "name": "Kakao Gift",
    "url": "https://gift.kakao.com",
    "check": [
      "signup_phone_auth",
      "i18n_ui",
      "support_en"
    ]
  }
]
```

---

## 묶음 2 / 9

```json
[
  {
    "service_id": "kakaobank",
    "name": "KakaoBank",
    "url": "https://www.kakaobank.com",
    "check": [
      "signup_phone_auth",
      "i18n_ui",
      "support_en"
    ]
  },
  {
    "service_id": "kobus",
    "name": "Kobus (Express Bus)",
    "url": "https://www.kobus.co.kr",
    "signup_url": "https://www.kobus.co.kr/mbrs/mbrsjoin/mbrsJoin.do",
    "check": [
      "signup_phone_auth",
      "i18n_ui",
      "support_en"
    ]
  },
  {
    "service_id": "lguplus",
    "name": "LG U+",
    "url": "https://www.lguplus.com",
    "signup_url": "https://account.lguplus.com/login?client_id=G8RoYUvnwILirwwwK3xG4WR8q9D83to7&login_type=STANDARD_WEB&prompt=select_account&i18nextLng=ko",
    "support_url": "https://www.lguplus.com/support/online/faq",
    "check": [
      "signup_phone_auth",
      "i18n_ui",
      "support_en"
    ]
  },
  {
    "service_id": "megabox",
    "name": "Megabox",
    "url": "https://www.megabox.co.kr",
    "check": [
      "signup_phone_auth",
      "i18n_ui",
      "support_en"
    ]
  },
  {
    "service_id": "musinsa",
    "name": "Musinsa",
    "url": "https://www.musinsa.com",
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
    "service_id": "oliveyoung",
    "name": "Olive Young",
    "url": "https://www.oliveyoung.co.kr",
    "signup_url": "https://www.cjone.com/cjmweb/join.do?coopco_cd=7030&brnd_cd=3000&mcht_no=3000",
    "check": [
      "signup_phone_auth",
      "i18n_ui",
      "support_en"
    ]
  },
  {
    "service_id": "gmarket",
    "name": "Gmarket",
    "url": "https://www.gmarket.co.kr",
    "signup_url": "https://signup-web.gmarket.co.kr/signup/privateBuyer?url=http%3A%2F%2Fwww.gmarket.co.kr",
    "check": [
      "i18n_ui",
      "support_en"
    ]
  },
  {
    "service_id": "goodchoice",
    "name": "GoodChoice (Yeogi Eottae)",
    "url": "https://www.yeogi.com",
    "signup_url": "https://platform.yeogi.com/login?redirectUri=https://www.yeogi.com/",
    "support_url": "https://www.yeogi.com/faq",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  },
  {
    "service_id": "kakao-map",
    "name": "Kakao Map",
    "url": "https://map.kakao.com",
    "signup_url": "https://accounts.kakao.com/login/?continue=https%3A%2F%2Fmap.kakao.com",
    "support_url": "https://cs.kakao.com/helps?locale=ko&service=101",
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
      "support_en"
    ]
  }
]
```

---

## 묶음 3 / 9

```json
[
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
    "service_id": "kakaotalk",
    "name": "KakaoTalk",
    "url": "https://www.kakaocorp.com",
    "support_url": "https://cs.kakao.com/",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  },
  {
    "service_id": "kbstar",
    "name": "KB Kookmin Bank",
    "url": "https://www.kbstar.com",
    "signup_url": "https://obank.kbstar.com/quics?page=C055068&QSL=F",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  },
  {
    "service_id": "lotte-cinema",
    "name": "Lotte Cinema",
    "url": "https://www.lottecinema.co.kr",
    "signup_url": "https://www.lottecinema.co.kr/NLCHS/Membership/l_point",
    "support_url": "https://www.lottecinema.co.kr/NLCHS/Customer",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  },
  {
    "service_id": "melon-ticket",
    "name": "Melon Ticket",
    "url": "https://ticket.melon.com",
    "signup_url": "https://accounts.melon.com/join/choice?cpId=WP15",
    "support_url": "https://ticket.melon.com/customerservice/notice.htm",
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
    "service_id": "naver-map",
    "name": "Naver Map",
    "url": "https://map.naver.com",
    "signup_url": "https://nid.naver.com/nidlogin.login?url=https%3A%2F%2Fmap.naver.com%2F",
    "support_url": "https://help.naver.com/service/5637/category/bookmark",
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
    "service_id": "nhis",
    "name": "National Health Insurance Service",
    "url": "https://www.nhis.or.kr",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  },
  {
    "service_id": "skt",
    "name": "SK Telecom (T world)",
    "url": "https://www.tworld.co.kr",
    "signup_url": "https://www.tworld.co.kr/web/login/tid-join",
    "support_url": "https://www.tworld.co.kr/web/support/faq/keyword",
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
    "service_id": "yanolja",
    "name": "Yanolja",
    "url": "https://www.yanolja.com",
    "signup_url": "https://accounts.yanolja.com/v3/login",
    "support_url": "https://ad.yanolja.com/intro",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  }
]
```

---

## 묶음 4 / 9

```json
[
  {
    "service_id": "yes24-ticket",
    "name": "YES24 Ticket",
    "url": "http://ticket.yes24.com",
    "signup_url": "https://www.yes24.com/Member/Join/Accept.aspx",
    "support_url": "https://ticket.yes24.com/UserGuide/FAQ",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  },
  {
    "service_id": "korail",
    "name": "Korail",
    "url": "https://www.korail.com",
    "signup_url": "https://www.korail.com/ticket/membership/ageCheck",
    "support_url": "https://www.korail.com/ticket/guest/csc/korailcs",
    "check": [
      "signup_phone_auth"
    ]
  },
  {
    "service_id": "kt",
    "name": "KT",
    "url": "https://www.kt.com",
    "signup_url": "https://accounts.kt.com/identify/personal",
    "support_url": "https://shop.kt.com/smart/supportAmtList.do",
    "check": [
      "support_en"
    ]
  },
  {
    "service_id": "shinhan-bank",
    "name": "Shinhan Bank",
    "url": "https://bank.shinhan.com",
    "signup_url": "https://www.shinhan.com/hpe/index.jsp#050601000000",
    "support_url": "https://www.shinhan.com/hpe/index.jsp",
    "check": [
      "support_en"
    ]
  },
  {
    "service_id": "visitkorea",
    "name": "Visit Korea (KTO)",
    "url": "https://english.visitkorea.or.kr",
    "support_url": "https://english.visitkorea.or.kr/svc/contents/contentsView.do?vcontsId=140632&menuSn=454",
    "check": [
      "signup_phone_auth"
    ]
  },
  {
    "service_id": "yogiyo",
    "name": "Yogiyo",
    "url": "https://www.yogiyo.co.kr",
    "signup_url": "https://www.yogiyo.co.kr/mobile/#/login/",
    "support_url": "https://www.yogiyo.co.kr",
    "check": [
      "support_en"
    ]
  },
  {
    "service_id": "auction",
    "name": "Auction",
    "url": "https://www.auction.co.kr",
    "check": [
      "signup_phone_auth",
      "i18n_ui",
      "support_en"
    ]
  },
  {
    "service_id": "epost",
    "name": "Korea Post",
    "url": "https://www.epost.go.kr",
    "check": [
      "signup_phone_auth",
      "i18n_ui",
      "support_en"
    ]
  },
  {
    "service_id": "interpark-tour",
    "name": "Interpark Tour",
    "url": "https://tour.interpark.com",
    "check": [
      "signup_phone_auth",
      "i18n_ui",
      "support_en"
    ]
  },
  {
    "service_id": "lotteon",
    "name": "Lotte ON",
    "url": "https://www.lotteon.com",
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
      "i18n_ui",
      "support_en"
    ]
  },
  {
    "service_id": "musinsa-global",
    "name": "Musinsa Global",
    "url": "https://global.musinsa.com",
    "check": [
      "signup_phone_auth",
      "i18n_ui",
      "support_en"
    ]
  }
]
```

---

## 묶음 5 / 9

```json
[
  {
    "service_id": "nts",
    "name": "National Tax Service",
    "url": "https://www.nts.go.kr",
    "support_url": "https://www.nts.go.kr/nts/na/ntt/selectNttList.do?mi=40254&bbsId=50692",
    "check": [
      "signup_phone_auth",
      "i18n_ui",
      "support_en"
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
    "service_id": "tmoney",
    "name": "T-money",
    "url": "https://www.t-money.co.kr",
    "check": [
      "signup_phone_auth",
      "i18n_ui",
      "support_en"
    ]
  },
  {
    "service_id": "txbus",
    "name": "Txbus (Intercity Bus)",
    "url": "https://txbus.t-money.co.kr",
    "check": [
      "signup_phone_auth",
      "i18n_ui",
      "support_en"
    ]
  },
  {
    "service_id": "woori-bank",
    "name": "Woori Bank",
    "url": "https://www.wooribank.com",
    "check": [
      "signup_phone_auth",
      "i18n_ui",
      "support_en"
    ]
  },
  {
    "service_id": "daangn",
    "name": "Karrot (Danggeun Market)",
    "url": "https://www.daangn.com",
    "support_url": "https://daangn.com/wv/faqs",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  },
  {
    "service_id": "daum",
    "name": "Daum",
    "url": "https://www.daum.net",
    "support_url": "https://cs.daum.net/",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  },
  {
    "service_id": "gmoneytrans",
    "name": "GME Remittance",
    "url": "https://www.gmoneytrans.com",
    "support_url": "https://gmoneytrans.com/supported-countries/",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  },
  {
    "service_id": "hana-bank",
    "name": "Hana Bank",
    "url": "https://www.kebhana.com",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  },
  {
    "service_id": "hanpass",
    "name": "Hanpass",
    "url": "https://www.hanpass.com",
    "support_url": "https://www.hanpass.com/en/cs",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  },
  {
    "service_id": "hira",
    "name": "HIRA",
    "url": "https://www.hira.or.kr",
    "support_url": "https://www.hira.or.kr/bbsDummy.do?pgmid=HIRAA010006011020&amp;WT.gnb=%EC%83%81%EB%8B%B4%EB%AC%B8%EC%9D%98",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  },
  {
    "service_id": "kurly",
    "name": "Market Kurly",
    "url": "https://www.kurly.com",
    "support_url": "https://docs.google.com/forms/d/e/1FAIpQLScWcjRuN6eWJK-G8x3NwBfE8IyKZIOq7jhD3fUXuKSWwPqzJw/viewform",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  }
]
```

---

## 묶음 6 / 9

```json
[
  {
    "service_id": "nonghyup",
    "name": "NH Nonghyup Bank",
    "url": "https://banking.nonghyup.com",
    "support_url": "https://banking.nonghyup.com/servlet/content/ip/ec/IPEC0001M.thtml",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  },
  {
    "service_id": "samsung-hospital",
    "name": "Samsung Medical Center",
    "url": "http://www.samsunghospital.com",
    "support_url": "http://www.samsunghospital.com/home/info/ICUfaq.do",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  },
  {
    "service_id": "snuh",
    "name": "Seoul National University Hospital",
    "url": "https://www.snuh.org",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  },
  {
    "service_id": "tossbank",
    "name": "Toss Bank",
    "url": "https://www.tossbank.com",
    "support_url": "https://www.tossbank.com/customer/information/privacy/privacy-policy",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  },
  {
    "service_id": "travel-wallet",
    "name": "Travel Wallet",
    "url": "https://www.travel-wallet.com",
    "support_url": "https://enterprise.travel-wallet.com/home",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  },
  {
    "service_id": "tving",
    "name": "TVING",
    "url": "https://www.tving.com",
    "support_url": "https://www.tving.com/help/notice",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  },
  {
    "service_id": "wavve",
    "name": "Wavve",
    "url": "https://www.wavve.com",
    "support_url": "https://www.wavve.com/customer/notice_list",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  },
  {
    "service_id": "amc",
    "name": "Asan Medical Center",
    "url": "https://www.amc.seoul.kr",
    "signup_url": "https://www.amc.seoul.kr/asan/member/join/intro.do",
    "support_url": "https://www.amc.seoul.kr/asan/custom/customervoice/customerVoiceInfo.do",
    "check": [
      "support_en"
    ]
  },
  {
    "service_id": "sac",
    "name": "Seoul Arts Center",
    "url": "https://www.sac.or.kr",
    "signup_url": "https://www.sac.or.kr/site/main/membership/member_step_membership",
    "support_url": "https://www.sac.or.kr/site/main/board/academyfaq/list",
    "check": [
      "support_en"
    ]
  },
  {
    "service_id": "sentbe",
    "name": "Sentbe",
    "url": "https://www.sentbe.com",
    "support_url": "https://help.sentbe.com/ko/support/home",
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
      "signup_phone_auth"
    ]
  }
]
```

---

## 묶음 7 / 9

```json
[
  {
    "service_id": "sk7mobile",
    "name": "SK 7mobile",
    "url": "https://www.sk7mobile.com",
    "support_url": "https://www.sk7mobile.com/util/support/deviceChange.do?refer=mognb",
    "check": [
      "signup_phone_auth"
    ]
  },
  {
    "service_id": "tmap",
    "name": "TMAP",
    "url": "https://www.tmap.co.kr",
    "support_url": "https://www.tmapmobility.com/support/data",
    "check": [
      "signup_phone_auth"
    ]
  },
  {
    "service_id": "wirebarley",
    "name": "WireBarley",
    "url": "https://www.wirebarley.com",
    "support_url": "https://help.wirebarley.com/ko/support/home",
    "check": [
      "signup_phone_auth"
    ]
  },
  {
    "service_id": "ably",
    "name": "Ably",
    "url": "https://a-bly.com",
    "check": [
      "signup_phone_auth",
      "i18n_ui",
      "support_en"
    ]
  },
  {
    "service_id": "genie",
    "name": "Genie Music",
    "url": "https://www.genie.co.kr",
    "check": [
      "signup_phone_auth",
      "i18n_ui",
      "support_en"
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
    "service_id": "ntok",
    "name": "National Theater of Korea",
    "url": "https://www.ntok.go.kr",
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
      "support_en"
    ]
  },
  {
    "service_id": "danawa",
    "name": "Danawa",
    "url": "https://www.danawa.com",
    "support_url": "https://help.danawa.com/",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  },
  {
    "service_id": "goodoc",
    "name": "Goodoc",
    "url": "https://www.goodoc.co.kr",
    "support_url": "https://www.goodoc.co.kr",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  },
  {
    "service_id": "gsshop",
    "name": "GS Shop",
    "url": "https://www.gsshop.com",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  },
  {
    "service_id": "hanatour",
    "name": "Hana Tour",
    "url": "https://www.hanatour.com",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  }
]
```

---

## 묶음 8 / 9

```json
[
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
    "service_id": "kyobo",
    "name": "Kyobo Book Centre",
    "url": "https://www.kyobobook.co.kr",
    "support_url": "https://www.kyobobook.co.kr/cscenter",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  },
  {
    "service_id": "modetour",
    "name": "Mode Tour",
    "url": "https://www.modetour.com",
    "support_url": "https://www.modetour.com/customer-center",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  },
  {
    "service_id": "seoul-metro",
    "name": "Seoul Metro",
    "url": "https://www.seoulmetro.co.kr",
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
      "support_en"
    ]
  },
  {
    "service_id": "themoin",
    "name": "Moin",
    "url": "https://themoin.com",
    "support_url": "https://www.themoin.com",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  },
  {
    "service_id": "watcha",
    "name": "Watcha",
    "url": "https://watcha.com",
    "support_url": "https://help.watcha.com/hc/ko",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  },
  {
    "service_id": "yes24",
    "name": "YES24",
    "url": "http://www.yes24.com",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  },
  {
    "service_id": "zigzag",
    "name": "Zigzag",
    "url": "https://zigzag.kr",
    "support_url": "https://zigzag.kr",
    "check": [
      "signup_phone_auth",
      "support_en"
    ]
  },
  {
    "service_id": "ddocdoc",
    "name": "DdocDoc",
    "url": "https://www.ddocdoc.com",
    "signup_url": "https://hospital.ddocdoc.com/register?utm_source=ddocdoc-com&amp;utm_medium=bottom-list&amp;utm_campaign=etc",
    "check": [
      "support_en"
    ]
  },
  {
    "service_id": "homeplus",
    "name": "Homeplus",
    "url": "https://front.homeplus.co.kr",
    "support_url": "https://mfront.homeplus.co.kr/cs?homeType=MART",
    "check": [
      "signup_phone_auth"
    ]
  },
  {
    "service_id": "payco",
    "name": "PAYCO",
    "url": "https://www.payco.com",
    "signup_url": "https://membership.payco.com/",
    "support_url": "https://www.payco.com/cs/faq.nhn",
    "check": [
      "support_en"
    ]
  }
]
```

---

## 묶음 9 / 9

```json
[
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
    "service_id": "safedriving",
    "name": "Korea Road Traffic Authority",
    "url": "https://www.safedriving.or.kr",
    "support_url": "https://www.safedriving.or.kr/main.do",
    "check": [
      "signup_phone_auth"
    ]
  }
]
```

