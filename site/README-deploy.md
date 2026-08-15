# 배포 설정 — 건드리기 전에 읽을 것

`vercel.json` 은 JSON 이라 주석을 못 넣고, Vercel 이 모르는 키를 넣으면
`should NOT have additional property` 로 빌드가 통째로 실패한다. 그래서 설명이 여기 있다.

## `ignoreCommand: "exit 1"` — 항상 빌드한다

종료 코드 `0` 이면 배포를 건너뛰고 `1` 이면 빌드하는 규칙이라, `exit 1` 은 "무조건 빌드".

이게 없으면 이 사이트는 **조용히 어제에 멈춘다.** 크론이 매일 고치는 것은 `data/` 인데
그건 루트 디렉터리(`site/`) 바깥이다. Vercel 이 보기에는 아무것도 안 바뀐 것이 되고,
대시보드의 "변경 없으면 배포 건너뛰기"가 켜져 있으면 배포를 거른다.
크론은 매일 초록색으로 돌고 커밋도 남는데 사이트만 갱신되지 않는다.
이 프로젝트가 파는 것이 신선도이므로, 대시보드 설정 하나에 맡기지 않고 여기 박아 둔다.

## Vercel 프로젝트 설정

| 항목 | 값 | 왜 |
|---|---|---|
| Root Directory | `site` | `/api/report` 함수를 배포하려면 Vercel 이 Next 앱 루트를 봐야 한다 |
| Include source files outside Root Directory | 켜기 | 사이트가 `../data` 를 읽는다. 끄면 115개 페이지를 만들 데이터가 없다 |
| Skip deployments when no changes | 끄기 | 위 참고. `ignoreCommand` 가 막고 있지만 굳이 켜지 말 것 |
| Framework / Build / Install Command | Override 끄기 | `vercel.json` 이 `nextjs` 로 잡는다 |

## 환경변수

| 이름 | 없으면 |
|---|---|
| `NEXT_PUBLIC_ISSUES_REPO` | `/report` 폼이 뜨지 않고 이메일 안내가 나온다 |
| `REPORTS_TOKEN` | 폼은 뜨지만 제출하면 "창구가 연결되지 않았습니다" 가 나온다 |
| `NEXT_PUBLIC_SITE_URL` | 기본값 `https://worksinkorea.com` 을 쓴다 |

`REPORTS_TOKEN` 은 GitHub 세밀 권한 토큰이며 **공개 제보 레포 하나에 Issues: Read and write** 만
주면 된다. 그 이상 주지 말 것.

## 설정만 바꿨을 때

저장해도 재배포는 안 된다. Deployments 탭에서 맨 위 배포의 `⋯` → Redeploy 를 눌러야 한다.
