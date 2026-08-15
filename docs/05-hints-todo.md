# 운영자 작업 목록 — 힌트 채우기

> 이 파일은 `npm run hints` 로 자동 생성됩니다. 직접 고치지 마세요.
> 생성 시각: 2026-08-15T03:19:59.830Z

## 하는 법 (한 항목당 1~2분)

1. 아래 표의 **서비스 링크**를 클릭해서 사이트를 엽니다.
2. `signup_url` 이 필요하면 → 그 사이트의 **회원가입** 버튼을 누릅니다.
   `support_url` 이 필요하면 → **고객센터/문의** 링크를 누릅니다.
3. 그때 **브라우저 주소창에 뜬 주소를 복사**합니다.
4. [`data/seeds/services.seed.json`](../data/seeds/services.seed.json) 에서 그 서비스 줄을 찾아
   `"hints": { ... }` 안에 붙여넣습니다.
5. 다 채웠으면 `npm run seed` 를 실행하고 커밋합니다.

### 붙여넣는 모양

```jsonc
// 고치기 전
{ "id": "kobus", "name": {...}, "url": "https://www.kobus.co.kr", "category": "transport", "importance": 1 }

// 고친 뒤 — 맨 뒤에 "hints" 를 추가한다
{ "id": "kobus", "name": {...}, "url": "https://www.kobus.co.kr", "category": "transport", "importance": 1,
  "hints": { "signup_url": "https://www.kobus.co.kr/mrs/join.do" } }
```

**확신이 없으면 비워 두세요.** 비워 두면 "모름"으로 정직하게 남지만,
잘못된 주소를 넣으면 틀린 데이터가 공개됩니다.

---

## 지금 채우면 바로 측정이 살아나는 서비스 (84건)

우선순위 1등급부터 정렬했습니다. **위에서부터 30개만 해도 충분합니다.**


### 우선순위 1등급

| 서비스 | 필요한 힌트 | 봇이 이미 시도해 본 주소 (전부 실패) |
|---|---|---|
| **[CGV](http://www.cgv.co.kr)**<br><sub>`cgv`</sub> | signup_url, support_url, 앱 ID | `/join` → 403 |
| **[쿠팡](https://www.coupang.com)**<br><sub>`coupang`</sub> | signup_url, support_url | `/join` → 403 |
| **[쿠팡이츠](https://www.coupangeats.com)**<br><sub>`coupang-eats`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[G마켓](https://www.gmarket.co.kr)**<br><sub>`gmarket`</sub> | signup_url, support_url | `/join` → 403 |
| **[여기어때](https://www.goodchoice.kr)**<br><sub>`goodchoice`</sub> | support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 200 |
| **[정부24](https://www.gov.kr)**<br><sub>`gov-kr`</sub> | signup_url, support_url, 앱 ID | `/join` → robots: Disallow: / |
| **[하이코리아](https://www.hikorea.go.kr)**<br><sub>`hikorea`</sub> | support_url, 앱 ID | `/join` → 200 |
| **[국세청 홈택스](https://www.hometax.go.kr)**<br><sub>`hometax`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[놀 인터파크 글로벌](https://world.nol.com)**<br><sub>`interpark-global`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[카카오맵](https://map.kakao.com)**<br><sub>`kakao-map`</sub> | signup_url, support_url | `/join` → robots: Disallow: / |
| **[카카오 T](https://www.kakaomobility.com)**<br><sub>`kakao-t`</sub> | signup_url, support_url | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[카카오페이](https://www.kakaopay.com)**<br><sub>`kakaopay`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[카카오톡](https://www.kakaocorp.com)**<br><sub>`kakaotalk`</sub> | signup_url, support_url | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[KB국민은행](https://www.kbstar.com)**<br><sub>`kbstar`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[고속버스통합예매](https://www.kobus.co.kr)**<br><sub>`kobus`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[코레일 (레츠코레일)](https://www.letskorail.com)**<br><sub>`korail`</sub> | signup_url, support_url | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[KT](https://www.kt.com)**<br><sub>`kt`</sub> | support_url, 앱 ID | `/join` → 200 |
| **[LG유플러스](https://www.lguplus.com)**<br><sub>`lguplus`</sub> | support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 200 |
| **[롯데시네마](https://www.lottecinema.co.kr)**<br><sub>`lotte-cinema`</sub> | support_url, 앱 ID | `/join` → 200 |
| **[멜론티켓](https://ticket.melon.com)**<br><sub>`melon-ticket`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[네이버](https://www.naver.com)**<br><sub>`naver`</sub> | signup_url, support_url | `/join` → robots: Disallow: / |
| **[네이버 지도](https://map.naver.com)**<br><sub>`naver-map`</sub> | signup_url, support_url | `/join` → robots: Disallow: / |
| **[네이버페이](https://pay.naver.com)**<br><sub>`naverpay`</sub> | signup_url, support_url, 앱 ID | `/join` → 200 |
| **[올리브영](https://www.oliveyoung.co.kr)**<br><sub>`oliveyoung`</sub> | signup_url, support_url, 앱 ID | `/join` → 403 |
| **[올리브영 글로벌](https://global.oliveyoung.com)**<br><sub>`oliveyoung-global`</sub> | signup_url, 앱 ID | `/join` → 403 |
| **[신한은행](https://bank.shinhan.com)**<br><sub>`shinhan-bank`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[SKT 티월드](https://www.tworld.co.kr)**<br><sub>`skt`</sub> | signup_url, support_url, 앱 ID | `/join` → robots: Disallow: */join* |
| **[SRT](https://etk.srail.co.kr)**<br><sub>`srt`</sub> | signup_url, support_url | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[토스](https://toss.im)**<br><sub>`toss`</sub> | signup_url, support_url | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[한국관광공사 비지트코리아](https://english.visitkorea.or.kr)**<br><sub>`visitkorea`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[야놀자](https://www.yanolja.com)**<br><sub>`yanolja`</sub> | support_url | `/join` → 404<br>`/signup` → 200 |
| **[예스24 티켓](http://ticket.yes24.com)**<br><sub>`yes24-ticket`</sub> | support_url, 앱 ID | `/join` → 200 |
| **[요기요](https://www.yogiyo.co.kr)**<br><sub>`yogiyo`</sub> | signup_url, support_url | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |

### 우선순위 2등급

| 서비스 | 필요한 힌트 | 봇이 이미 시도해 본 주소 (전부 실패) |
|---|---|---|
| **[서울아산병원](https://www.amc.seoul.kr)**<br><sub>`amc`</sub> | support_url, 앱 ID | `/join` → 200 |
| **[옥션](https://www.auction.co.kr)**<br><sub>`auction`</sub> | signup_url, support_url, 앱 ID | `/join` → 403 |
| **[친구모바일](https://www.chingumobile.com)**<br><sub>`chingu-mobile`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 403 |
| **[당근마켓](https://www.daangn.com)**<br><sub>`daangn`</sub> | signup_url, support_url | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[다음](https://www.daum.net)**<br><sub>`daum`</sub> | signup_url, support_url, 앱 ID | `/join` → robots: Disallow: / |
| **[지머니트랜스](https://www.gmoneytrans.com)**<br><sub>`gmoneytrans`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[하나은행](https://www.kebhana.com)**<br><sub>`hana-bank`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[한패스](https://www.hanpass.com)**<br><sub>`hanpass`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[건강보험심사평가원](https://www.hira.or.kr)**<br><sub>`hira`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[KT엠모바일](https://www.ktmmobile.com)**<br><sub>`ktmmobile`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[마켓컬리](https://www.kurly.com)**<br><sub>`kurly`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[국립중앙박물관](https://www.museum.go.kr)**<br><sub>`national-museum`</sub> | support_url, 앱 ID | `/join` → 200 |
| **[NH농협은행](https://banking.nonghyup.com)**<br><sub>`nonghyup`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[국세청](https://www.nts.go.kr)**<br><sub>`nts`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[예술의전당](https://www.sac.or.kr)**<br><sub>`sac`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[삼성서울병원](http://www.samsunghospital.com)**<br><sub>`samsung-hospital`</sub> | signup_url, support_url, 앱 ID | `/join` → 400<br>`/signup` → 400<br>`/member/join` → 400<br>`/register` → 400<br>`/user/join` → 400 |
| **[센트비](https://www.sentbe.com)**<br><sub>`sentbe`</sub> | support_url, 앱 ID | `/join` → 200 |
| **[서울글로벌센터](https://global.seoul.go.kr)**<br><sub>`seoul-global`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[세브란스병원](https://sev.severance.healthcare)**<br><sub>`severance`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → robots: Disallow: /member/ |
| **[SK세븐모바일](https://www.sk7mobile.com)**<br><sub>`sk7mobile`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[서울대학교병원](https://www.snuh.org)**<br><sub>`snuh`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[스타벅스 코리아](https://www.starbucks.co.kr)**<br><sub>`starbucks-kr`</sub> | support_url, 앱 ID | `/join` → 200 |
| **[티맵](https://www.tmap.co.kr)**<br><sub>`tmap`</sub> | signup_url, support_url | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[티머니](https://www.t-money.co.kr)**<br><sub>`tmoney`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[토스뱅크](https://www.tossbank.com)**<br><sub>`tossbank`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[트래블월렛](https://www.travel-wallet.com)**<br><sub>`travel-wallet`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[티빙](https://www.tving.com)**<br><sub>`tving`</sub> | signup_url, support_url | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[웨이브](https://www.wavve.com)**<br><sub>`wavve`</sub> | signup_url, support_url, 앱 ID | `/join` → robots: Disallow: / |
| **[와이어바알리](https://www.wirebarley.com)**<br><sub>`wirebarley`</sub> | support_url, 앱 ID | `/join` → 200 |
| **[우리은행](https://www.wooribank.com)**<br><sub>`woori-bank`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |

### 우선순위 3등급

| 서비스 | 필요한 힌트 | 봇이 이미 시도해 본 주소 (전부 실패) |
|---|---|---|
| **[에이블리](https://a-bly.com)**<br><sub>`ably`</sub> | signup_url, support_url, 앱 ID | `/join` → robots: Disallow: / |
| **[알라딘](https://www.aladin.co.kr)**<br><sub>`aladin`</sub> | support_url, 앱 ID | `/join` → 200 |
| **[CJ온스타일](https://www.cjonstyle.com)**<br><sub>`cjonstyle`</sub> | signup_url, support_url, 앱 ID | `/join` → 200 |
| **[다나와](https://www.danawa.com)**<br><sub>`danawa`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → robots: Disallow: /member/ |
| **[똑닥](https://www.ddocdoc.com)**<br><sub>`ddocdoc`</sub> | signup_url, support_url, 앱 ID | `/join` → robots: Disallow: / |
| **[굿닥](https://www.goodoc.co.kr)**<br><sub>`goodoc`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[하나투어](https://www.hanatour.com)**<br><sub>`hanatour`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[홈플러스](https://front.homeplus.co.kr)**<br><sub>`homeplus`</sub> | support_url, 앱 ID | `/join` → 200 |
| **[케이뱅크](https://www.kbanknow.com)**<br><sub>`kbank`</sub> | support_url, 앱 ID | `/join` → 200 |
| **[교보문고](https://www.kyobobook.co.kr)**<br><sub>`kyobo`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[모두투어](https://www.modetour.com)**<br><sub>`modetour`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[국립극장](https://www.ntok.go.kr)**<br><sub>`ntok`</sub> | signup_url, support_url, 앱 ID | `/join` → 400<br>`/signup` → 400<br>`/member/join` → 400<br>`/register` → 400<br>`/user/join` → 400 |
| **[페이코](https://www.payco.com)**<br><sub>`payco`</sub> | support_url, 앱 ID | `/join` → 200 |
| **[리디북스](https://ridibooks.com)**<br><sub>`ridibooks`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[도로교통공단 안전운전 통합민원](https://www.safedriving.or.kr)**<br><sub>`safedriving`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[서울교통공사](https://www.seoulmetro.co.kr)**<br><sub>`seoul-metro`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → TypeError: fetch failed<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[타다](https://tadatada.com)**<br><sub>`tada`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[모인](https://themoin.com)**<br><sub>`themoin`</sub> | support_url, 앱 ID | `/join` → 200 |
| **[왓챠](https://watcha.com)**<br><sub>`watcha`</sub> | support_url | `/join` → 200 |
| **[예스24](http://www.yes24.com)**<br><sub>`yes24`</sub> | support_url, 앱 ID | `/join` → 200 |
| **[지그재그](https://zigzag.kr)**<br><sub>`zigzag`</sub> | support_url, 앱 ID | `/join` → 200 |

---

## 힌트를 채워도 소용없는 서비스 (22건) — 손대지 마세요

robots.txt가 우리 봇의 접근을 전면 금지하고 있어, 주소를 채워도 측정할 수 없습니다.
이 서비스들은 **커뮤니티 제보로만** 채웁니다 (docs/03-decisions.md D-9).

`11st`, `baemin`, `catchtable`, `e-gen`, `interpark-ticket`, `kakao-gift`, `kakaobank`, `megabox`, `musinsa`, `naver-booking`, `naver-shopping`, `nhis`, `epost`, `interpark-tour`, `lotteon`, `melon`, `musinsa-global`, `ssg`, `txbus`, `genie`, `gsshop`, `ibk`
