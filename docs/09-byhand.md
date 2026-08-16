# 직접 확인할 목록

`npm run byhand` 가 만듦. **57곳 · 87개 항목.**

## 하는 법

1. **시크릿 창**(Ctrl+Shift+N)을 연다. 로그인된 계정이 하나도 없어야 한다.
   한국인 회원이 보는 화면과 외국인이 처음 보는 화면은 다르다.
2. 아래 항목마다 `열기:` 주소를 붙여넣고 본다.
3. **`답:` 과 `본 것:` 두 줄만 채운다.** 이 파일에 그대로 적으면 된다.
4. 다 하면(또는 하다 말고) 저장하고 Claude 에게 "byhand 반영해줘" 라고 한다.

**모르면 `모름` 이라고 적으면 된다.** 그게 정답이다 — 빈칸은 나중에 채우면 되지만,
틀린 답은 그걸 믿은 사람을 공항에서 멈춰 세운다. 확실하지 않으면 `모름`.

`본 것:` 에는 **화면에서 본 것을 그대로** 적는다. 판단이 아니라 관찰이다.

| | |
|---|---|
| ❌ | `확인함` · `인증 필요함` |
| ⭕ | `통신사 선택(SKT/KT/LGU+)이 나오고 이메일 가입은 없었다` |
| ⭕ | `우측 위 EN 을 누르니 메뉴가 전부 영어로 바뀌었다` |

한 줄이라도 적혀 있으면 기록되고, `본 것:` 이 비어 있으면 그 항목은 건너뛴다.

### `signup_phone_auth` — 가입할 때 한국 휴대폰이 필요한가

**보는 법** 가입 화면을 열고 **양식만 읽는다.** 계정을 만들지 않는다. 휴대폰 인증 화면이 나오면 **국가번호 칸에 +82 말고 다른 나라가 있는지** 꼭 본다.

**답에 쓸 것** required(한국 번호만) · any_phone(해외 번호도 됨) · optional(이메일·애플 등 다른 길) · not_required(인증 자체가 없음) · 모름

### `i18n_ui` — 어떤 언어로 쓸 수 있는가

**보는 법** 첫 화면에서 언어 전환(KO/EN·지구본·Language)을 찾아 **눌러서 실제로 바뀌는지** 본다. 브라우저 자동 번역은 세지 않는다.

**답에 쓸 것** ko en 처럼 코드를 띄어쓰기로 나열 (ko 한국어 · en 영어 · ja 일본어 · zh 중국어 · vi 베트남어 · th 태국어 · id 인니어 · ru 러시아어 · mn 몽골어 · km 크메르어) · 모름

### `support_en` — 영어로 문의할 수 있는가

**보는 법** 고객센터·FAQ 를 **실제로 열어** 영어 안내나 영어 문의 창구가 있는지 본다. 첫 화면에 언어 버튼이 없다는 것만으로 "없음"이라고 하지 않는다.

**답에 쓸 것** yes(영어 있음) · no(열어봤고 한국어뿐) · 모름

---

## 코워크가 못 한 것 — 사람만 할 수 있음

브라우저 확장이 막았거나(네이버·쿠팡·토스…) 이미 로그인돼 있어(카카오·TVING·리디)
신규 방문자 화면을 볼 수 없었던 곳이다. **여기가 제일 값지다** — 사람이 제일 많이 찾을 서비스들이다.

### 11st · 11번가   `11st`

**1. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://www.11st.co.kr

답:
본 것:

**2. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://www.11st.co.kr

답:
본 것:

**3. 영어로 문의할 수 있는가**  `support_en`

열기: https://www.11st.co.kr

답:
본 것:

### Coupang · 쿠팡   `coupang`

**4. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://login.coupang.com/login/login.pang

답:
본 것:

**5. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://www.coupang.com

답:
본 것:

**6. 영어로 문의할 수 있는가**  `support_en`

열기: https://mc.coupang.com/ssr/desktop/contact/faq

답:
본 것:

### Naver Booking · 네이버 예약   `naver-booking`

**7. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://booking.naver.com

답:
본 것:

**8. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://booking.naver.com

답:
본 것:

**9. 영어로 문의할 수 있는가**  `support_en`

열기: https://booking.naver.com

답:
본 것:

### Naver Map · 네이버 지도   `naver-map`

**10. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://nid.naver.com/nidlogin.login?url=https%3A%2F%2Fmap.naver.com%2F

답:
본 것:

**11. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://map.naver.com

답:
본 것:

**12. 영어로 문의할 수 있는가**  `support_en`

열기: https://help.naver.com/service/5637/category/bookmark

답:
본 것:

### Naver Shopping · 네이버쇼핑   `naver-shopping`

**13. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://shopping.naver.com

답:
본 것:

**14. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://shopping.naver.com

답:
본 것:

**15. 영어로 문의할 수 있는가**  `support_en`

열기: https://shopping.naver.com

답:
본 것:

### Coupang Eats · 쿠팡이츠   `coupang-eats`

**16. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://www.coupangeats.com

답:
본 것:

**17. 영어로 문의할 수 있는가**  `support_en`

열기: https://www.coupangeats.com

답:
본 것:

### Kakao T · 카카오 T   `kakao-t`

**18. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://www.kakaomobility.com

답:
본 것:

**19. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://www.kakaomobility.com

답:
본 것:

### KakaoPay · 카카오페이   `kakaopay`

**20. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://www.kakaopay.com

답:
본 것:

**21. 영어로 문의할 수 있는가**  `support_en`

열기: https://support.kakaopay.com/web/faq-list/all

답:
본 것:

### Naver · 네이버   `naver`

**22. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://nid.naver.com/account/signup/term

답:
본 것:

**23. 영어로 문의할 수 있는가**  `support_en`

열기: https://help.naver.com/service/5627/contents/9148?lang=ko

답:
본 것:

### Naver Pay · 네이버페이   `naverpay`

**24. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://pay.naver.com

답:
본 것:

**25. 영어로 문의할 수 있는가**  `support_en`

열기: https://help.naver.com/service/5640/category/bookmark?lang=ko

답:
본 것:

### Toss · 토스   `toss`

**26. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://toss.im

답:
본 것:

**27. 영어로 문의할 수 있는가**  `support_en`

열기: https://support.toss.im/

답:
본 것:

### Kakao Gift · 카카오톡 선물하기   `kakao-gift`

**28. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://gift.kakao.com

답:
본 것:

### KakaoTalk · 카카오톡   `kakaotalk`

**29. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://www.kakaocorp.com

답:
본 것:

### SSG.COM · SSG닷컴   `ssg`

**30. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://www.ssg.com

답:
본 것:

**31. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://www.ssg.com

답:
본 것:

**32. 영어로 문의할 수 있는가**  `support_en`

열기: https://www.ssg.com

답:
본 것:

### TVING · 티빙   `tving`

**33. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://www.tving.com

답:
본 것:

**34. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://www.tving.com

답:
본 것:

### IBK Industrial Bank · IBK기업은행   `ibk`

**35. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://www.ibk.co.kr

답:
본 것:

**36. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://www.ibk.co.kr

답:
본 것:

**37. 영어로 문의할 수 있는가**  `support_en`

열기: https://www.ibk.co.kr

답:
본 것:

### K bank · 케이뱅크   `kbank`

**38. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://www.kbanknow.com

답:
본 것:

**39. 영어로 문의할 수 있는가**  `support_en`

열기: https://www.kbanknow.com/web/customer/faq/list

답:
본 것:

### RIDI Books · 리디북스   `ridibooks`

**40. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://ridibooks.com

답:
본 것:

---

## 나머지

### Baemin · 배달의민족   `baemin`

**41. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://www.baemin.com

답:
본 것:

### CatchTable · 캐치테이블   `catchtable`

**42. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://www.catchtable.co.kr

답:
본 것:

### CGV   `cgv`

**43. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: http://www.cgv.co.kr

답:
본 것:

### GoodChoice (Yeogi Eottae) · 여기어때   `goodchoice`

**44. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://www.yeogi.com

답:
본 것:

### KB Kookmin Bank · KB국민은행   `kbstar`

**45. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://obank.kbstar.com/quics?page=C055068&QSL=F

답:
본 것:

### Shinhan Bank · 신한은행   `shinhan-bank`

**46. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://bank.shinhan.com

답:
본 것:

### Yanolja · 야놀자   `yanolja`

**47. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://www.yanolja.com

답:
본 것:

### Yogiyo · 요기요   `yogiyo`

**48. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://www.yogiyo.co.kr

답:
본 것:

### Melon · 멜론   `melon`

**49. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://www.melon.com

답:
본 것:

**50. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://www.melon.com

답:
본 것:

### NH Nonghyup Bank · NH농협은행   `nonghyup`

**51. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://banking.nonghyup.com

답:
본 것:

**52. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://banking.nonghyup.com

답:
본 것:

### TMAP · 티맵   `tmap`

**53. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://www.tmap.co.kr

답:
본 것:

**54. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://www.tmap.co.kr

답:
본 것:

### Toss Bank · 토스뱅크   `tossbank`

**55. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://www.tossbank.com

답:
본 것:

**56. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://www.tossbank.com

답:
본 것:

### Auction · 옥션   `auction`

**57. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://www.auction.co.kr

답:
본 것:

### Karrot (Danggeun Market) · 당근마켓   `daangn`

**58. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://www.daangn.com

답:
본 것:

### Daum · 다음   `daum`

**59. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://www.daum.net

답:
본 것:

### GME Remittance · 지머니트랜스   `gmoneytrans`

**60. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://www.gmoneytrans.com

답:
본 것:

### Hana Bank · 하나은행   `hana-bank`

**61. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://www.kebhana.com

답:
본 것:

### HIRA · 건강보험심사평가원   `hira`

**62. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://www.hira.or.kr

답:
본 것:

### KT M mobile · KT엠모바일   `ktmmobile`

**63. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://www.ktmmobile.com

답:
본 것:

### Market Kurly · 마켓컬리   `kurly`

**64. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://www.kurly.com

답:
본 것:

### Seoul Global Center · 서울글로벌센터   `seoul-global`

**65. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://global.seoul.go.kr

답:
본 것:

### Severance Hospital · 세브란스병원   `severance`

**66. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://sev.severance.healthcare

답:
본 것:

### SK 7mobile · SK세븐모바일   `sk7mobile`

**67. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://www.sk7mobile.com

답:
본 것:

### T-money · 티머니   `tmoney`

**68. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://www.t-money.co.kr

답:
본 것:

### Txbus (Intercity Bus) · 시외버스 통합예매   `txbus`

**69. 영어로 문의할 수 있는가**  `support_en`

열기: https://txbus.t-money.co.kr

답:
본 것:

### Wavve · 웨이브   `wavve`

**70. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://www.wavve.com

답:
본 것:

### Woori Bank · 우리은행   `woori-bank`

**71. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://www.wooribank.com

답:
본 것:

### Seoul Metro · 서울교통공사   `seoul-metro`

**72. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://www.seoulmetro.co.kr

답:
본 것:

**73. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://www.seoulmetro.co.kr

답:
본 것:

**74. 영어로 문의할 수 있는가**  `support_en`

열기: https://www.seoulmetro.co.kr

답:
본 것:

### GS Shop · GS샵   `gsshop`

**75. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://www.gsshop.com

답:
본 것:

**76. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://www.gsshop.com

답:
본 것:

### TADA · 타다   `tada`

**77. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://tadatada.com

답:
본 것:

**78. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://tadatada.com

답:
본 것:

### Ably · 에이블리   `ably`

**79. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://a-bly.com

답:
본 것:

### CJ ONSTYLE · CJ온스타일   `cjonstyle`

**80. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://www.cjonstyle.com

답:
본 것:

### Danawa · 다나와   `danawa`

**81. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://www.danawa.com

답:
본 것:

### DdocDoc · 똑닥   `ddocdoc`

**82. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://www.ddocdoc.com

답:
본 것:

### Goodoc · 굿닥   `goodoc`

**83. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://www.goodoc.co.kr

답:
본 것:

### Hana Tour · 하나투어   `hanatour`

**84. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://www.hanatour.com

답:
본 것:

### Mode Tour · 모두투어   `modetour`

**85. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://www.modetour.com

답:
본 것:

### PAYCO · 페이코   `payco`

**86. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://www.payco.com

답:
본 것:

### Zigzag · 지그재그   `zigzag`

**87. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://zigzag.kr

답:
본 것:

---

확인한 날짜는 적지 않아도 된다 — 반영하는 날(2026-08-16 같은)로 기록된다.
