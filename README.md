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
