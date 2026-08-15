# Works in Korea? — 측정 엔진

한국 온라인 서비스가 외국인에게 실제로 작동하는지를 매일 자동 측정한다.
제품 배경은 [CLAUDE.md](CLAUDE.md)와 [docs/](docs/)를 먼저 읽을 것.

이 저장소는 **측정 엔진(프라이빗)** 이다. 산출 데이터와 웹사이트는 공개한다 ([docs/03-decisions.md](docs/03-decisions.md) D-4).

---

## 운영자가 알아야 할 것 (코드를 읽지 않아도 됨)

### 이게 지금 뭘 하고 있나

매일 새벽 3시(KST), GitHub Actions가 106개 한국 서비스를 하나씩 열어보고 6가지를 확인한 뒤,
결과를 JSON으로 이 저장소에 커밋한다. 서버는 없고 비용은 0원이다.

### 명령어 3개

| 명령어 | 하는 일 |
|---|---|
| `npm run hints` | **운영자 작업 목록 생성** → [docs/05-hints-todo.md](docs/05-hints-todo.md) |
| `npm run seed` | 서비스 목록을 수정한 뒤 실행. 목록 → 데이터 파일 동기화 |
| `npm run probe` | 측정 1회 실행 (전체 약 8분) |
| `npm run validate` | 데이터가 규칙을 지키는지 검사 |

일부만 시험해 보고 싶으면:
```
npm run probe -- --only=coupang,toss
npm run probe -- --limit=5 --dry-run     # 파일에 쓰지 않고 결과만 출력
```

### 서비스를 추가·수정하려면

[`data/seeds/services.seed.json`](data/seeds/services.seed.json) 한 파일만 고치면 된다.
항목을 추가하고 `npm run seed` 를 실행한 뒤 커밋하면, 다음 측정부터 포함된다.

`hints` 를 채우면 측정 정확도가 크게 올라간다 (비워도 동작한다):

| 힌트 | 채우면 좋아지는 것 |
|---|---|
| `signup_url` | 가입 본인인증 탐지 — **지금 가장 효과가 큰 항목** |
| `support_url` | 영문 고객지원 판정 |
| `ios_app_id` | App Store 등재 확인 (App Store 주소의 `id` 뒤 숫자) |
| `android_package` | Google Play 등재 확인 (Play 주소의 `id=` 뒤 값) |
| `checkout_url` | 결제 게이트 탐지 (공개 페이지만) |

**확신 없는 값은 비워 둘 것.** 비워 두면 "모름"으로 정직하게 남고, 잘못 채우면 틀린 데이터가 공개된다.

### 산출물이 어디에 쌓이나

| 경로 | 내용 |
|---|---|
| `data/services/<id>.json` | 서비스별 측정값 + 근거 |
| `data/changes/<날짜>.json` | 그날 **실제로 값이 바뀐 것만** — 2주차 `/changes` 페이지의 재료 |
| `data/runs/latest.json` | 마지막 실행 요약 (소요 시간, 오류 수 등) |

---

## 지금 각 시그널이 얼마나 쓸모 있나 (2026-08-15 기준, 106개 서비스)

정직하게 적는다. "미측정"이 많은 것은 버그가 아니라 설계다 — 모르면 모른다고 쓴다.

| 시그널 | 상태 | 측정됨 | 왜 |
|---|---|---|---|
| `overseas_access` 해외 접속 | **잘 됨** | 78 / 106 | 나머지 28건은 robots.txt가 금지하거나 봇을 막음 |
| `i18n_ui` 다국어 UI | **잘 됨** | 78 / 106 | 40건은 한국어만, 38건은 다국어 확인 |
| `payment_gate` 결제 게이트 | 부분적 | 78 / 106 | 그중 11건에서만 PG 탐지. 결제 페이지가 로그인 뒤에 있어서 정상 |
| `app_availability` 앱 등재 | 힌트 필요 | 20 / 106 | 시드에 앱 ID를 채운 20건만. **국가별 출시 여부는 측정 불가** (아래 참조) |
| `signup_phone_auth` 본인인증 | **힌트 필요** | 20 / 106 | 가입 페이지 주소를 못 찾음. `hints.signup_url` 을 채우면 바로 살아난다 |
| `support_en` 영문 지원 | **키 필요** | 1 / 106 | `ANTHROPIC_API_KEY` 가 없어 휴리스틱만 돌고 있다 |

### 운영자가 하면 코앞에서 좋아지는 것 2가지

1. **힌트 채우기** — `npm run hints` 를 실행하면 [docs/05-hints-todo.md](docs/05-hints-todo.md) 에
   "어느 서비스에 무엇을 채워야 하는지"가 우선순위 순으로 나온다.
   봇이 이미 시도해 본 주소와 실패 사유까지 같이 나오므로, 사이트에 들어가 주소만 복사해 오면 된다.
   우선순위 1등급 30개만 해도 충분하다.
2. **`ANTHROPIC_API_KEY` 를 저장소 Secret으로 등록** — 영문 지원 시그널이 켜진다. 비용은 아래 참조.

---

## 크롤링 예의 — 코드로 강제된 것

[CLAUDE.md](CLAUDE.md) 절대규칙 4를 코드 레벨에서 지킨다. 우회 경로를 만들지 말 것.

- **robots.txt 준수** — 모든 요청 전에 검사. 금지면 요청 자체를 하지 않는다 (`src/lib/robots.ts`)
- **저빈도** — 하루 1회, 같은 호스트에 2초 이상 간격 (`src/lib/limiter.ts`)
- **User-Agent에 프로젝트 URL·연락처 명시** (`src/config.ts`)
- **자동 결제 시도 없음** — 공개 페이지의 스크립트 주소만 읽는다
- **자동 로그인·계정 생성 시도 없음** — 브라우저 래퍼가 입력·클릭 기능을 아예 노출하지 않는다 (`src/lib/browser.ts`)
- **예외는 2가지뿐이고 전부 공개** — `src/config.ts` 의 `ROBOTS_EXEMPT_PREFIXES`(Apple 공개 조회 API)와
  `HOST_DELAY_OVERRIDES`(앱스토어 호스트 간격 단축). `/method` 페이지에 그대로 싣는다.

`data/signatures/*.json` 의 탐지 시그니처도 전부 공개 대상이다 — 측정 방법을 숨기지 않는다.

---

## Actions 설정 (한 번만)

저장소 **Settings → Secrets and variables → Actions** 에서:

| 종류 | 이름 | 값 | 필수? |
|---|---|---|---|
| Secret | `ANTHROPIC_API_KEY` | Claude API 키 | 선택 (없으면 `support_en` 이 unknown으로 남음) |
| Variable | `WIK_PROJECT_URL` | 공개 사이트 주소 | 선택 (도메인 정해지면) |
| Variable | `WIK_CONTACT` | 정정 요청 받을 주소 | 선택 |
| Variable | `WIK_LLM_MODEL` | 기본 `claude-sonnet-5` | 선택 |

**Actions 사용량**: 1회 약 8분 → 월 약 250분. Free 플랜 2,000분의 **12%**. 여유가 크다.

### LLM 비용 — 매일 전부 분류하지 않는다

고객지원 페이지는 거의 바뀌지 않으므로, **페이지 내용이 지난번과 같으면 LLM을 호출하지 않고
이전 판정을 그대로 유지**한다 (`measured_at` 은 갱신되므로 신선도 정보는 유지된다).
날짜·조회수처럼 매일 바뀌는 숫자는 해시 계산에서 제외해, 실제 내용이 바뀔 때만 다시 묻는다.

| | `claude-sonnet-5` (기본) | `claude-haiku-4-5` |
|---|---|---|
| 첫 실행 (전량 분류) | 약 3,000원 (1회성) | 약 1,000원 |
| 이후 매달 (바뀐 것만) | **1만원 안팎** | 3천원 안팎 |

이 장치가 없으면 매일 106건을 다시 분류해 Sonnet 5 기준 월 15만원을 넘긴다.
강제로 전부 다시 분류하려면 `WIK_LLM_FORCE=1 npm run probe` 를 쓴다.

LLM에 보내는 글자 수는 서비스당 8,000자로 제한돼 있다 (`WIK_LLM_MAX_CHARS` 로 조절).
늘리면 판정 정확도가 조금 오르고 비용이 비례해서 오른다.

---

## 구조

```
data/seeds/services.seed.json   ← 사람이 관리하는 서비스 목록 (여기만 고치면 됨)
data/signatures/*.json          ← 본인인증·PG 탐지 시그니처 (공개 대상)
data/services/*.json            ← 측정 결과 (봇이 매일 커밋)
schema/service.schema.json      ← 데이터 규격. 이걸 어기면 CI가 막는다
src/probes/*.ts                 ← 자동 프로브 6종
src/lib/                        ← robots/rate-limit/브라우저/시그널 공통 계층
.github/workflows/              ← daily-probe(크론), validate(PR 검사)
```

데이터 라이선스: **CC BY** (출처 표시). 코드는 비공개.

---

## 공개 사이트 (`site/`)

`data/` 를 읽어 **정적 HTML** 로 뽑는 Next.js 프로젝트다. 서버가 필요 없다.

```bash
cd site
npm install        # 최초 1회
npm run dev        # http://localhost:3000 — 눈으로 확인
npm run build      # out/ 에 정적 파일 생성 (배포용)
npm run typecheck
```

`npm run dev` / `npm run build` 는 실행 전에 `data/` 를 읽어
`site/public/api/v1/` 아래 공개 JSON API 파일을 자동 생성한다.

### 페이지

| 주소 | 내용 |
|---|---|
| `/` | 서비스 목록. 검색·카테고리·"영어 UI 있음/본인인증 필수/자동측정 불가" 필터 |
| `/service/<id>/` | 서비스 상세. 시그널 8종 + 측정시각·방법·신뢰도 + **원본 근거 전문** |
| `/changes/` | 값이 바뀐 날짜별 기록 |
| `/method/` | 측정 방법, 하지 않는 것, 알려진 약점 |
| `/api-docs/` | 공개 JSON API 문서 |

### 공개 JSON API

| 경로 | 내용 |
|---|---|
| `/api/v1/services.json` | 전체 서비스 + 전체 시그널 |
| `/api/v1/services/<id>.json` | 서비스 1건 |
| `/api/v1/changes.json` | 변경 이력 전체 |
| `/api/v1/meta.json` | 데이터셋 크기·라이선스·마지막 측정 실행 정보 |

키·가입·요청 제한 없음. CC BY 4.0.

### 배포

레포 최상위의 **`vercel.json`** 이 모든 설정을 담고 있다. Vercel UI에서는 **아무것도 바꾸지 않고
Deploy 만 누르면 된다** — Root Directory 도, Framework Preset 도 건드리지 않는다.

```json
{
  "framework": null,
  "installCommand": "cd site && npm ci",
  "buildCommand":   "cd site && npm run build",
  "outputDirectory": "site/out"
}
```

**왜 Root Directory 를 쓰지 않는가** (D-13)
Vercel의 Root Directory 폴더 목록은 서버에 캐시되어, 폴더를 새로 푸시해도 목록에 나타나지 않는 일이
실제로 있었다. 게다가 Root Directory 를 `site` 로 잡으면 기본 설정이 상위 폴더를 빌드에서 제외해
`../data` 가 사라지고, 별도 체크박스를 켜야 한다. `vercel.json` 은 두 문제를 모두 없앤다.

Vercel Hobby는 비상업 프로젝트 전용 티어이며 현재 조건에 부합한다 (D-4).
`out/` 은 순수 정적 파일이므로 GitHub Pages·S3 등 어디에 올려도 동일하게 동작한다.

### 사이트가 지키는 표시 규칙 (D-12)

- **"측정 안 됨"은 점선 회색**으로 그리고, **왜 비었는지를 항상 함께 쓴다.**
  실패가 아니라 일부러 비워둔 칸으로 읽혀야 한다.
- 색은 좋다·나쁘다가 아니라 "외국인 앞에 장벽이 있는가"만 나타낸다. 색만으로 의미를 전달하지 않는다.
- 값이 있어도 오해를 부를 수 있으면 단서를 붙인다
  (예: 결제사 목록이 비었다 ≠ 결제 불가).

---

## 제보 (3주차)

자동으로 잴 수 없는 것을 사람에게 받는다. 시그널 8종 중 2종(해외 카드·해외 SMS)과
자동 측정이 막힌 31개 서비스에게는 **제보가 유일한 데이터원**이다 (D-9, D-14, D-16).

```
GitHub Issue Form  (.github/ISSUE_TEMPLATE/*.yml — 개인정보를 적을 칸 자체가 없음)
   ↓ report-intake 워크플로
npm run ingest -- --file=issue.json
   ├ 개인정보 패턴 검사 → 걸리면 본문을 버리고 반려 (디스크에 쓰기 전)
   ├ 구조화해서 data/reports/<이슈번호>.json 저장
   └ 같은 서비스의 제보를 집계 → 시그널 갱신
   ↓
PR 자동 생성  ← 사람이 승인해야 main 에 들어간다
```

`npm run ingest -- --reapply` 는 저장된 제보만 다시 집계한다 (이슈 없이).

**엇갈리면 고르지 않는다.** 상반된 제보가 오면 `mixed` + 신뢰도 `conflicting` 으로 남는다.
해외 카드는 발급사·발급국·시점에 따라 갈리는 것이 정상이라, 하나를 고르는 순간 거짓이 된다.

**공개 레포가 있어야 외부인이 제보할 수 있다.** 코드 레포는 프라이빗이라 외부인이 이슈를
열 수 없다. 공개 레포를 만든 뒤 Vercel 환경변수 `NEXT_PUBLIC_ISSUES_REPO` 에
`소유자/이름` 을 넣으면 `/report` 의 버튼이 살아난다. 그전까지는 "준비 중"으로 표시된다.

---

## 사이트 UI 규칙 (D-12, D-15)

- **언어**: 두 언어를 모두 HTML에 넣고 CSS로 한쪽만 보여준다. 기본은 영어이며 한국어는
  사용자가 버튼을 눌렀을 때만. 브라우저 언어는 보지 않는다 (한국 거주 외국인에게 자주 틀림).
  문구를 추가할 때는 `<T en="..." ko="..." />` 를 쓴다. 긴 산문은 `<Only lang="en">`.
- **"측정 안 됨"은 점선 회색** + 왜 비었는지를 값 자리에 함께 쓴다. 결함이 아니라 일부러 비운 칸.
- **색은 좋다·나쁘다가 아니라 "장벽이 있는가"**만 나타내고, 색 단독으로 의미를 전달하지 않는다.
- **한국어는 `word-break: keep-all`** 이 필수다. 없으면 "신분증"이 "신분/증"으로 갈라진다.
