# 운영자 작업 목록 — 힌트 채우기

> 이 파일은 `npm run hints` 로 자동 생성됩니다. 직접 고치지 마세요.
> 생성 시각: 2026-08-15T09:01:37.116Z

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

## 지금 채우면 바로 측정이 살아나는 서비스 (58건)

우선순위 1등급부터 정렬했습니다. **위에서부터 30개만 해도 충분합니다.**


### 우선순위 1등급

| 서비스 | 필요한 힌트 | 봇이 이미 시도해 본 주소 (전부 실패) |
|---|---|---|
| **[여기어때](https://www.yeogi.com)**<br><sub>`goodchoice`</sub> | support_url | `/login` → hints.signup_url |
| **[놀 인터파크 글로벌](https://world.nol.com)**<br><sub>`interpark-global`</sub> | support_url, 앱 ID | `/en/auth-web/email-join` → hints.signup_url |
| **[카카오 T](https://www.kakaomobility.com)**<br><sub>`kakao-t`</sub> | signup_url | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[카카오페이](https://www.kakaopay.com)**<br><sub>`kakaopay`</sub> | signup_url | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[카카오톡](https://www.kakaocorp.com)**<br><sub>`kakaotalk`</sub> | signup_url | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[KB국민은행](https://www.kbstar.com)**<br><sub>`kbstar`</sub> | support_url | `/quics` → hints.signup_url |
| **[롯데시네마](https://www.lottecinema.co.kr)**<br><sub>`lotte-cinema`</sub> | support_url | `/NLCHS/Membership/l_point` → hints.signup_url |
| **[멜론티켓](https://ticket.melon.com)**<br><sub>`melon-ticket`</sub> | support_url | `/join/choice` → hints.signup_url |
| **[네이버](https://www.naver.com)**<br><sub>`naver`</sub> | support_url | `/account/signup/term` → hints.signup_url |
| **[네이버 지도](https://map.naver.com)**<br><sub>`naver-map`</sub> | support_url | `/nidlogin.login` → hints.signup_url |
| **[네이버페이](https://pay.naver.com)**<br><sub>`naverpay`</sub> | signup_url | `/join` → 200 |
| **[국민건강보험공단](https://www.nhis.or.kr)**<br><sub>`nhis`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[SKT 티월드](https://www.tworld.co.kr)**<br><sub>`skt`</sub> | support_url, 앱 ID | `/web/login/tid-join` → hints.signup_url |
| **[토스](https://toss.im)**<br><sub>`toss`</sub> | signup_url | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[한국관광공사 비지트코리아](https://english.visitkorea.or.kr)**<br><sub>`visitkorea`</sub> | signup_url, support_url | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[요기요](https://www.yogiyo.co.kr)**<br><sub>`yogiyo`</sub> | support_url | `/mobile/` → hints.signup_url |

### 우선순위 2등급

| 서비스 | 필요한 힌트 | 봇이 이미 시도해 본 주소 (전부 실패) |
|---|---|---|
| **[서울아산병원](https://www.amc.seoul.kr)**<br><sub>`amc`</sub> | 앱 ID | `/asan/member/join/intro.do` → hints.signup_url |
| **[친구모바일](https://www.chingumobile.com)**<br><sub>`chingu-mobile`</sub> | 앱 ID | `/index/signup` → hints.signup_url |
| **[당근마켓](https://www.daangn.com)**<br><sub>`daangn`</sub> | signup_url | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[다음](https://www.daum.net)**<br><sub>`daum`</sub> | signup_url, support_url | `/join` → robots: Disallow: / |
| **[지머니트랜스](https://www.gmoneytrans.com)**<br><sub>`gmoneytrans`</sub> | signup_url | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[하나은행](https://www.kebhana.com)**<br><sub>`hana-bank`</sub> | signup_url, support_url | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[한패스](https://www.hanpass.com)**<br><sub>`hanpass`</sub> | signup_url, support_url | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[건강보험심사평가원](https://www.hira.or.kr)**<br><sub>`hira`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[마켓컬리](https://www.kurly.com)**<br><sub>`kurly`</sub> | signup_url, support_url | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[국립중앙박물관](https://www.museum.go.kr)**<br><sub>`national-museum`</sub> | support_url, 앱 ID | `/MUSEUM/contents/membership.do` → hints.signup_url |
| **[예술의전당](https://www.sac.or.kr)**<br><sub>`sac`</sub> | 앱 ID | `/site/main/membership/member_step_membership` → hints.signup_url |
| **[삼성서울병원](http://www.samsunghospital.com)**<br><sub>`samsung-hospital`</sub> | signup_url, support_url, 앱 ID | `/join` → 400<br>`/signup` → 400<br>`/member/join` → 400<br>`/register` → 400<br>`/user/join` → 400 |
| **[센트비](https://www.sentbe.com)**<br><sub>`sentbe`</sub> | signup_url, support_url | `/join` → 200 |
| **[서울글로벌센터](https://global.seoul.go.kr)**<br><sub>`seoul-global`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[세브란스병원](https://sev.severance.healthcare)**<br><sub>`severance`</sub> | signup_url | `/join` → 404<br>`/signup` → 404<br>`/member/join` → robots: Disallow: /member/ |
| **[SK세븐모바일](https://www.sk7mobile.com)**<br><sub>`sk7mobile`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[서울대학교병원](https://www.snuh.org)**<br><sub>`snuh`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[스타벅스 코리아](https://www.starbucks.co.kr)**<br><sub>`starbucks-kr`</sub> | support_url | `/mem/join1.do` → hints.signup_url |
| **[티맵](https://www.tmap.co.kr)**<br><sub>`tmap`</sub> | signup_url | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[토스뱅크](https://www.tossbank.com)**<br><sub>`tossbank`</sub> | signup_url | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[트래블월렛](https://www.travel-wallet.com)**<br><sub>`travel-wallet`</sub> | signup_url | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[티빙](https://www.tving.com)**<br><sub>`tving`</sub> | signup_url | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[웨이브](https://www.wavve.com)**<br><sub>`wavve`</sub> | signup_url, support_url | `/join` → robots: Disallow: / |
| **[와이어바알리](https://www.wirebarley.com)**<br><sub>`wirebarley`</sub> | signup_url | `/join` → 200 |

### 우선순위 3등급

| 서비스 | 필요한 힌트 | 봇이 이미 시도해 본 주소 (전부 실패) |
|---|---|---|
| **[CJ온스타일](https://www.cjonstyle.com)**<br><sub>`cjonstyle`</sub> | signup_url, support_url, 앱 ID | `/join` → 200 |
| **[다나와](https://www.danawa.com)**<br><sub>`danawa`</sub> | signup_url | `/join` → 404<br>`/signup` → 404<br>`/member/join` → robots: Disallow: /member/ |
| **[똑닥](https://www.ddocdoc.com)**<br><sub>`ddocdoc`</sub> | support_url | `/register` → hints.signup_url |
| **[굿닥](https://www.goodoc.co.kr)**<br><sub>`goodoc`</sub> | signup_url, support_url | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[GS샵](https://www.gsshop.com)**<br><sub>`gsshop`</sub> | signup_url, support_url, 앱 ID | `/join` → 200 |
| **[하나투어](https://www.hanatour.com)**<br><sub>`hanatour`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[홈플러스](https://front.homeplus.co.kr)**<br><sub>`homeplus`</sub> | signup_url, support_url | `/join` → 200 |
| **[케이뱅크](https://www.kbanknow.com)**<br><sub>`kbank`</sub> | signup_url, 앱 ID | `/join` → 200 |
| **[교보문고](https://www.kyobobook.co.kr)**<br><sub>`kyobo`</sub> | signup_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[모두투어](https://www.modetour.com)**<br><sub>`modetour`</sub> | signup_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[페이코](https://www.payco.com)**<br><sub>`payco`</sub> | support_url | `/` → hints.signup_url |
| **[리디북스](https://ridibooks.com)**<br><sub>`ridibooks`</sub> | signup_url | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[도로교통공단 안전운전 통합민원](https://www.safedriving.or.kr)**<br><sub>`safedriving`</sub> | signup_url, support_url, 앱 ID | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[타다](https://tadatada.com)**<br><sub>`tada`</sub> | signup_url | `/join` → 404<br>`/signup` → 404<br>`/member/join` → 404<br>`/register` → 404<br>`/user/join` → 404 |
| **[모인](https://themoin.com)**<br><sub>`themoin`</sub> | signup_url, support_url, 앱 ID | `/join` → 200 |
| **[왓챠](https://watcha.com)**<br><sub>`watcha`</sub> | signup_url | `/join` → 200 |
| **[예스24](http://www.yes24.com)**<br><sub>`yes24`</sub> | signup_url, support_url | `/join` → 200 |
| **[지그재그](https://zigzag.kr)**<br><sub>`zigzag`</sub> | signup_url, support_url | `/join` → 200 |

---

## 자동 접근이 막힌 서비스 (40건) — 앱 ID만 채울 수 있습니다

이 서비스들은 사이트가 우리 봇을 막고 있어 가입 주소·고객센터 주소를 채워도 소용없습니다.
**앱 정보는 다릅니다.** 앱이 스토어에 있는지는 애플·구글에 묻는 것이라 그 사이트의 차단과
무관합니다. 지금 이 31곳은 한 칸도 채워져 있지 않은데, 앱 ID 하나만 넣어도 빈 줄이 아니게 됩니다.

### 하는 법

아래 표의 **Play** 나 **App Store** 링크를 눌러 앱을 찾은 다음, 주소창을 복사해서 붙여넣습니다.

```bash
npm run add-app -- coupang "https://play.google.com/store/apps/details?id=com.coupang.mobile"
```

주소는 **반드시 따옴표로 감싸세요.** `?` 와 `&` 가 있어서 그냥 넣으면 잘립니다.
두 스토어를 한 줄에 같이 줘도 되고, 하나만 줘도 됩니다.

도구가 스토어에 실제로 있는지 확인하고 **앱 이름을 찍어 줍니다.** 이름이 엉뚱하면 잘못 복사한 것이니
다시 하면 됩니다. 없는 ID 는 아예 기록하지 않습니다.

다 넣은 뒤 `npm run seed` 를 한 번 돌리고 커밋하면 끝입니다.

| 서비스 | 이미 있는 것 | 스토어에서 찾기 |
|---|---|---|
| **11번가**<br><sub>`11st`</sub> | iOS `397938216`<br>Play `com.elevenst` |  |
| **배달의민족**<br><sub>`baemin`</sub> | iOS `378084485`<br>Play `com.sampleapp` |  |
| **캐치테이블**<br><sub>`catchtable`</sub> | iOS `1485193566`<br>Play `co.kr.catchtable.android.catchtable_app` |  |
| **CGV**<br><sub>`cgv`</sub> | iOS `6738896323`<br>Play `co.kr.cgv.cjcgv` |  |
| **쿠팡**<br><sub>`coupang`</sub> | iOS `454434967`<br>Play `com.coupang.mobile` |  |
| **쿠팡이츠**<br><sub>`coupang-eats`</sub> | iOS `1445504255`<br>Play `com.coupang.mobile.eats` |  |
| **응급의료포털 E-Gen**<br><sub>`e-gen`</sub> | iOS `385668523` | [Play](https://play.google.com/store/search?q=%EC%9D%91%EA%B8%89%EC%9D%98%EB%A3%8C%ED%8F%AC%ED%84%B8%20E-Gen&c=apps) |
| **G마켓**<br><sub>`gmarket`</sub> | iOS `340330132`<br>Play `com.ebay.kr.gmarket` |  |
| **정부24**<br><sub>`gov-kr`</sub> | iOS `586454505`<br>Play `kr.go.minwon.m` |  |
| **하이코리아**<br><sub>`hikorea`</sub> | 없음 | [Play](https://play.google.com/store/search?q=%ED%95%98%EC%9D%B4%EC%BD%94%EB%A6%AC%EC%95%84&c=apps) · [App Store](https://www.apple.com/kr/search/%ED%95%98%EC%9D%B4%EC%BD%94%EB%A6%AC%EC%95%84?src=serp) |
| **국세청 홈택스**<br><sub>`hometax`</sub> | 없음 | [Play](https://play.google.com/store/search?q=%EA%B5%AD%EC%84%B8%EC%B2%AD%20%ED%99%88%ED%83%9D%EC%8A%A4&c=apps) · [App Store](https://www.apple.com/kr/search/%EA%B5%AD%EC%84%B8%EC%B2%AD%20%ED%99%88%ED%83%9D%EC%8A%A4?src=serp) |
| **인터파크 티켓**<br><sub>`interpark-ticket`</sub> | iOS `440487844`<br>Play `com.interpark.app.ticket` |  |
| **카카오톡 선물하기**<br><sub>`kakao-gift`</sub> | 없음 | [Play](https://play.google.com/store/search?q=%EC%B9%B4%EC%B9%B4%EC%98%A4%ED%86%A1%20%EC%84%A0%EB%AC%BC%ED%95%98%EA%B8%B0&c=apps) · [App Store](https://www.apple.com/kr/search/%EC%B9%B4%EC%B9%B4%EC%98%A4%ED%86%A1%20%EC%84%A0%EB%AC%BC%ED%95%98%EA%B8%B0?src=serp) |
| **카카오뱅크**<br><sub>`kakaobank`</sub> | iOS `1258016944`<br>Play `com.kakaobank.channel` |  |
| **고속버스통합예매**<br><sub>`kobus`</sub> | 없음 | [Play](https://play.google.com/store/search?q=%EA%B3%A0%EC%86%8D%EB%B2%84%EC%8A%A4%ED%86%B5%ED%95%A9%EC%98%88%EB%A7%A4&c=apps) · [App Store](https://www.apple.com/kr/search/%EA%B3%A0%EC%86%8D%EB%B2%84%EC%8A%A4%ED%86%B5%ED%95%A9%EC%98%88%EB%A7%A4?src=serp) |
| **KT**<br><sub>`kt`</sub> | Play `com.ktshow.cs` | [App Store](https://www.apple.com/kr/search/KT?src=serp) |
| **LG유플러스**<br><sub>`lguplus`</sub> | iOS `945578864`<br>Play `com.lguplus.mobile.cs` |  |
| **메가박스**<br><sub>`megabox`</sub> | iOS `894443858`<br>Play `com.megabox.mop` |  |
| **무신사**<br><sub>`musinsa`</sub> | iOS `1003139529`<br>Play `com.musinsa.store` |  |
| **네이버 예약**<br><sub>`naver-booking`</sub> | 없음 | [Play](https://play.google.com/store/search?q=%EB%84%A4%EC%9D%B4%EB%B2%84%20%EC%98%88%EC%95%BD&c=apps) · [App Store](https://www.apple.com/kr/search/%EB%84%A4%EC%9D%B4%EB%B2%84%20%EC%98%88%EC%95%BD?src=serp) |
| **네이버쇼핑**<br><sub>`naver-shopping`</sub> | iOS `6738063154`<br>Play `com.navercorp.navershopping` |  |
| **올리브영**<br><sub>`oliveyoung`</sub> | iOS `873779010`<br>Play `com.oliveyoung` |  |
| **신한은행**<br><sub>`shinhan-bank`</sub> | iOS `357484932`<br>Play `com.shinhan.sbanking` |  |
| **옥션**<br><sub>`auction`</sub> | iOS `380239756`<br>Play `com.ebay.kr.auction` |  |
| **우체국**<br><sub>`epost`</sub> | iOS `435940000`<br>Play `kr.go.epost.app.findZip` |  |
| **인터파크 투어**<br><sub>`interpark-tour`</sub> | iOS `775349206`<br>Play `com.interpark.tour.mobile.main` |  |
| **롯데온**<br><sub>`lotteon`</sub> | iOS `376622474`<br>Play `com.lotte` |  |
| **멜론**<br><sub>`melon`</sub> | Play `com.iloen.melon` | [App Store](https://www.apple.com/kr/search/%EB%A9%9C%EB%A1%A0?src=serp) |
| **무신사 글로벌**<br><sub>`musinsa-global`</sub> | 없음 | [Play](https://play.google.com/store/search?q=%EB%AC%B4%EC%8B%A0%EC%82%AC%20%EA%B8%80%EB%A1%9C%EB%B2%8C&c=apps) · [App Store](https://www.apple.com/kr/search/%EB%AC%B4%EC%8B%A0%EC%82%AC%20%EA%B8%80%EB%A1%9C%EB%B2%8C?src=serp) |
| **NH농협은행**<br><sub>`nonghyup`</sub> | iOS `1444712671`<br>Play `nh.smart.banking` |  |
| **국세청**<br><sub>`nts`</sub> | 없음 | [Play](https://play.google.com/store/search?q=%EA%B5%AD%EC%84%B8%EC%B2%AD&c=apps) · [App Store](https://www.apple.com/kr/search/%EA%B5%AD%EC%84%B8%EC%B2%AD?src=serp) |
| **SSG닷컴**<br><sub>`ssg`</sub> | iOS `786135420`<br>Play `kr.co.ssg` |  |
| **티머니**<br><sub>`tmoney`</sub> | iOS `1470361790`<br>Play `com.lgt.tmoney` |  |
| **시외버스 통합예매**<br><sub>`txbus`</sub> | 없음 | [Play](https://play.google.com/store/search?q=%EC%8B%9C%EC%99%B8%EB%B2%84%EC%8A%A4%20%ED%86%B5%ED%95%A9%EC%98%88%EB%A7%A4&c=apps) · [App Store](https://www.apple.com/kr/search/%EC%8B%9C%EC%99%B8%EB%B2%84%EC%8A%A4%20%ED%86%B5%ED%95%A9%EC%98%88%EB%A7%A4?src=serp) |
| **우리은행**<br><sub>`woori-bank`</sub> | iOS `1470181651`<br>Play `com.wooribank.smart.npib` |  |
| **에이블리**<br><sub>`ably`</sub> | iOS `1084960428`<br>Play `com.banhala.android` |  |
| **지니뮤직**<br><sub>`genie`</sub> | iOS `858266085`<br>Play `com.ktmusic.geniemusic` |  |
| **IBK기업은행**<br><sub>`ibk`</sub> | iOS `1460543865`<br>Play `com.ibk.android.ionebank` |  |
| **국립극장**<br><sub>`ntok`</sub> | 없음 | [Play](https://play.google.com/store/search?q=%EA%B5%AD%EB%A6%BD%EA%B7%B9%EC%9E%A5&c=apps) · [App Store](https://www.apple.com/kr/search/%EA%B5%AD%EB%A6%BD%EA%B7%B9%EC%9E%A5?src=serp) |
| **서울교통공사**<br><sub>`seoul-metro`</sub> | iOS `1174757125` | [Play](https://play.google.com/store/search?q=%EC%84%9C%EC%9A%B8%EA%B5%90%ED%86%B5%EA%B3%B5%EC%82%AC&c=apps) |
