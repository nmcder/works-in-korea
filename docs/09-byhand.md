# 직접 확인할 목록

`npm run byhand` 가 만듦. **13곳 · 16개 항목.**

기계가 닿지 못한 것만 남았습니다. **묶음마다 드는 품이 다릅니다** — 위에서부터 싼 것이고,
맨 아래 묶음은 앱을 깔아야 합니다. 한 묶음만 하고 덮으셔도 그만큼 채워집니다.

## 하는 법

1. **시크릿 창**(Ctrl+Shift+N)을 연다. 로그인된 계정이 하나도 없어야 한다.
   한국인 회원이 보는 화면과 외국인이 처음 보는 화면은 다르다.
2. 항목마다 `열기:` 주소를 붙여넣고 본다.
3. **`답:` 과 `본 것:` 두 줄만 채운다.** 이 파일에 그대로 적으면 된다.
4. 다 하면(또는 하다 말고) 저장하고 Claude 에게 "byhand 반영해줘" 라고 한다.

**모르면 `모름` 이라고 적으면 된다.** 그게 정답이다 — 빈칸은 나중에 채우면 되지만,
틀린 답은 그걸 믿은 사람을 공항에서 멈춰 세운다. 확실하지 않으면 `모름`.

`본 것:` 에는 **화면에서 본 것을 그대로** 적는다. 판단이 아니라 관찰이다.

| | |
|---|---|
| ❌ | `확인함` · `인증 필요함` |
| ⭕ | `통신사 선택(SKT/KT/LGU+)만 있고 국가번호 칸은 없었다` |
| ⭕ | `우측 위 EN 을 누르니 메뉴가 전부 영어로 바뀌었다` |

### `signup_phone_auth` — 가입할 때 한국 휴대폰이 필요한가

**보는 법** 가입 화면을 열고 **양식만 읽는다.** 계정을 만들지 않는다. 휴대폰 인증 화면이 나오면 **국가번호 칸에 +82 말고 다른 나라가 있는지**, 통신사 목록에 한국 통신사만 있는지 꼭 본다.

**답에 쓸 것** required(한국 번호만) · any_phone(해외 번호도 됨) · optional(이메일·여권 등 다른 길) · not_required(인증 자체가 없음) · 모름

### `i18n_ui` — 어떤 언어로 쓸 수 있는가

**보는 법** 첫 화면에서 언어 전환(KO/EN·지구본·Language)을 찾아 **눌러서 실제로 바뀌는지** 본다. 브라우저 자동 번역은 세지 않는다. 다른 회사의 별도 사이트로 나가는 링크도 세지 않는다.

**답에 쓸 것** ko en 처럼 코드를 띄어쓰기로 나열 (ko 한국어 · en 영어 · ja 일본어 · zh 중국어 · vi 베트남어 · th 태국어 · id 인니어 · ru 러시아어 · mn 몽골어 · km 크메르어) · 모름

### `support_en` — 영어로 문의할 수 있는가

**보는 법** 고객센터·FAQ 를 **실제로 열어** 영어 안내나 영어 문의 창구가 있는지 본다. 첫 화면에 언어 버튼이 없다는 것만으로 "없음"이라고 하지 않는다.

**답에 쓸 것** yes(영어 있음) · no(열어봤고 한국어뿐) · 모름

---

## 시크릿 창에서 열면 끝 — 한 곳에 1분

**3곳 · 4개 항목.**

robots.txt 가 **크롤러를** 막는 곳입니다. 우리는 그 약속을 지켜서 안 열지만, robots.txt 는 사람을 막는 규칙이 아닙니다. 브라우저로 그냥 열면 보입니다.

여기가 제일 값집니다 — 사람이 가장 많이 찾는 서비스인데 우리 데이터에만 비어 있습니다.

### Naver Map · 네이버 지도   `naver-map`

**1. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://map.naver.com

답:
본 것:

### SSG.COM · SSG닷컴   `ssg`

**2. 어떤 언어로 쓸 수 있는가**  `i18n_ui`

열기: https://www.ssg.com

답:
본 것:

**3. 영어로 문의할 수 있는가**  `support_en`

열기: https://www.ssg.com/customer/main.ssg

답:
본 것:

### IBK Industrial Bank · IBK기업은행   `ibk`

**4. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://www.ibk.co.kr

답:
본 것:

---

## 한국에서는 열릴 수도 있음 — 한 곳에 1분

**1곳 · 2개 항목.**

해외에서 재면 서버가 아예 응답하지 않습니다(빈 응답·503). 운영자님은 한국에 계시니 **그냥 열릴 가능성이 높습니다.** 열리면 그 자체가 답입니다.

### Seoul Metro · 서울교통공사   `seoul-metro`

**5. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://www.seoulmetro.co.kr

답:
본 것:

**6. 영어로 문의할 수 있는가**  `support_en`

열기: https://www.seoulmetro.co.kr

답:
본 것:

---

## 윈도우 보안프로그램을 깔아야 함 — 귀찮음

**2곳 · 2개 항목.**

가입 양식이 보안프로그램(TouchEn nxKey 같은 .exe) 설치 뒤에 있습니다. 저는 실행파일을 설치하지 않습니다.

**내키지 않으시면 건너뛰셔도 됩니다** — 맥이나 폰을 쓰는 외국인도 똑같이 못 지나가는 문이라, 비어 있는 것 자체가 어느 정도 사실을 말해 줍니다.

### NH Nonghyup Bank · NH농협은행   `nonghyup`

**7. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://banking.nonghyup.com

답:
본 것:

### T-money · 티머니   `tmoney`

**8. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://pay.tmoney.co.kr/ncs/pct/mbrsintg/ReadIntgJoinPrsnAthn.dev

답:
본 것:

---

## 앱을 깔고 가입을 시작해야 함 — 제일 무거움

**6곳 · 7개 항목.**

웹에는 가입 창구가 아예 없고 앱 안에만 있습니다.

**끝까지 가입하실 필요는 없습니다.** 휴대폰 번호를 넣는 화면까지만 가서 **국가번호를 고를 수 있는지, 통신사 목록에 한국 통신사만 있는지**만 보시고 뒤로 나오시면 됩니다.

### Coupang Eats · 쿠팡이츠   `coupang-eats`

**9. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://www.coupangeats.com

답:
본 것:

**10. 영어로 문의할 수 있는가**  `support_en`

열기: https://www.coupangeats.com

답:
본 것:

### GME Remittance · 지머니트랜스   `gmoneytrans`

**11. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://www.gmoneytrans.com

답:
본 것:

### TMAP · 티맵   `tmap`

**12. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://www.tmap.co.kr

답:
본 것:

### Toss Bank · 토스뱅크   `tossbank`

**13. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://www.tossbank.com

답:
본 것:

### K bank · 케이뱅크   `kbank`

**14. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://www.kbanknow.com

답:
본 것:

### TADA · 타다   `tada`

**15. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://tadatada.com

답:
본 것:

---

## 그 밖에

**1곳 · 1개 항목.**

위 어디에도 안 들어가는 것들입니다.

### Seoul Global Center · 서울글로벌센터   `seoul-global`

**16. 가입할 때 한국 휴대폰이 필요한가**  `signup_phone_auth`

열기: https://global.seoul.go.kr

답:
본 것:

---

확인한 날짜는 적지 않아도 된다 — 반영하는 날(2026-08-18 같은)로 기록된다.
