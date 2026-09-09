# CHEONGSANDO Shortcut

Notion에 적어 둔 주소를 짧은 키로 열어주는 바로가기 서비스입니다.

`cs.io.kr/example` 처럼 접속하면 **바로 이동하지 않고** 목적지의 미리보기·제목·주소를 먼저
보여주고, **이동 버튼을 눌러야** 이동합니다. 키 없이 `cs.io.kr` 로 접속하면 키 입력 화면이 나옵니다.

바로가기를 추가·수정하려면 **Notion 표에 한 줄 쓰면 됩니다.** 코드 수정도, 재배포도 필요 없습니다.

---

## 배포 순서

| 단계 | 할 일 | 걸리는 시간 |
|---|---|---|
| [1](#1-준비물) | 준비물 확인 | 1분 |
| [2](#2-notion-표-만들기) | Notion 표 만들기 | 5분 |
| [3](#3-notion-연결하기) | Notion 연결하고 값 3개 챙기기 | 5분 |
| [4](#4-환경변수) | 환경변수 확인 | 1분 |
| [5](#5-vercel-배포) | Vercel 배포 | 5분 |

배포 후에는 [6. 운영](#6-운영) 과 [7. 문제 해결](#7-문제-해결) 만 보시면 됩니다.

<details>
<summary>그 외 항목</summary>

- [8. 문구·이름 바꾸기](#8-문구이름-바꾸기)
- [9. 내 컴퓨터에서 실행해 보기](#9-내-컴퓨터에서-실행해-보기)
- [작업 안내](AGENT.md) — 코드를 고칠 때

</details>

---

## 1. 준비물

| 준비물 | 비고 |
|---|---|
| Notion 계정 | 바로가기 표를 둘 워크스페이스 |
| Vercel 계정 | <https://vercel.com> — GitHub 계정으로 로그인 |
| 이 저장소 접근 권한 | Vercel이 코드를 읽어갑니다 |

서버·데이터베이스·도메인은 **준비하지 않아도 됩니다.** 도메인이 없으면 Vercel이 주소를 하나 줍니다.

---

## 2. Notion 표 만들기

1. Notion에서 새 페이지를 만들고 **표(Table)** 를 추가합니다.

2. 아래 속성을 **이름과 타입 그대로** 만듭니다.

   | 속성 이름 | 타입 | 필수 | 무엇을 적나요 |
   |---|---|---|---|
   | `Key` | **제목(Title)** | ✅ | 바로가기 키 → `cs.io.kr/여기` |
   | `URL` | **URL** | ✅ | 이동할 목적지 주소 |
   | `Enabled` | **선택(Select)** | ✅ | `Enabled` 또는 `Disabled` |
   | `Title` | 텍스트(Rich text) | | 확인 화면의 제목 |
   | `Description` | 텍스트(Rich text) | | 확인 화면의 설명 |
   | `Aliases` | 다중 선택(Multi-select) | | 같은 목적지의 다른 키 |

3. `Enabled` 속성의 선택 옵션으로 **`Enabled`** 와 **`Disabled`** 두 개를 만듭니다.

4. 시험용으로 한 줄 채웁니다.

   | Key | URL | Enabled | Title | Description |
   |---|---|---|---|---|
   | `example` | `https://github.com/cheongsan/shortcut` | `Enabled` | 예시 바로가기 | 이 저장소로 이동합니다 |

> **속성 이름은 대소문자까지 정확히 맞춰 주세요.** 하나라도 다르면 동작하지 않습니다.
> 다만 조용히 실패하지는 않습니다 — 어떤 속성을 확인해야 하는지 로그에 찍힙니다.

### 입력 규칙

| 항목 | 규칙 |
|---|---|
| `Key` 문자 | 소문자·숫자·`-`·`_` 만. **점(`.`)과 공백은 불가.** 최대 64자 |
| `Key` 대문자 | 자동으로 소문자 처리 (`/EXAMPLE` → `/example` 로 안내) |
| 쓸 수 없는 `Key` | `api`, `_next`, `icon`, `opengraph-image`, `static` |
| `Enabled` 철자 | 대소문자·공백을 구분합니다. `enabled` 나 `Enabled ` 는 다른 값 |
| `Enabled` 미선택 | **꺼진 것으로 처리** — 실수로 공개되는 일을 막기 위한 동작 |
| `Title` 비움 | 목적지 주소(예: `github.com`)가 제목으로 표시 |
| `URL` 형식 | `http://` 또는 `https://` 만. 그 외는 안전을 위해 무시 |
| `Aliases` | 옵션명에 쉼표 불가(Notion 제약). 같은 키면 `Key` 가 우선 |

---

## 3. Notion 연결하기

서비스가 표를 읽을 수 있게 권한을 주고, 배포에 넣을 값을 챙기는 단계입니다.

1. <https://www.notion.so/my-integrations> → **New integration** 을 만듭니다.
   권한은 **Read content** 하나면 충분합니다.

2. 생성 후 나오는 **시크릿**을 복사합니다. → 이 값이 **`NOTION_TOKEN`** 입니다.
   `ntn_` 으로 시작합니다 (예전에 만든 것은 `secret_`).

3. **2번에서 만든 Notion 표 페이지를 열고, `⋯` → `Connections` → 방금 만든 인테그레이션을
   추가합니다.**

4. 같은 페이지에서 **Share** → **Copy link** 로 주소를 복사합니다.
   → 이 값이 **`NOTION_DATABASE_ID`** 입니다. URL을 그대로 넣으면 되고, ID만 잘라낼 필요는 없습니다.

---

## 4. 환경변수

3번에서 챙긴 값 두 개가 필수입니다. 나머지는 선택입니다.

| 이름 | 필수 | 값 |
|---|---|---|
| `NOTION_TOKEN` | ✅ | 인테그레이션 시크릿 (`ntn_…`) |
| `NOTION_DATABASE_ID` | ✅ | 표의 링크 (URL 그대로) |
| `NEXT_PUBLIC_SITE_URL` | 권장 | 서비스 주소 (예: `https://cs.io.kr`). **끝에 `/` 없이** |
| `NOTION_DATA_SOURCE_ID` | 선택 | 넣으면 첫 응답이 조금 빨라집니다 |

---

## 5. Vercel 배포

1. Vercel 대시보드 → **Add New** → **Project** → 이 저장소를 **Import** 합니다.

2. 빌드 설정은 **모두 기본값 그대로** 둡니다.
   Next.js로 자동 인식되고, Node 버전도 자동으로 24.x가 선택됩니다 (Vercel의 현재 기본값).

3. **Environment Variables** 에 [4번](#4-환경변수)의 값을 넣습니다.
   **`Production` · `Preview` · `Development` 세 곳 모두**에 넣어 주세요.

4. **Deploy** 를 누릅니다. 1~2분이면 끝납니다.

5. 나온 `프로젝트이름.vercel.app` 주소로 접속해 확인합니다.
   - 키 입력 화면이 뜨는지
   - `/example` 이 열리는지

6. (선택) **Settings** → **Domains** 에서 원하는 주소를 연결합니다.
   연결한 뒤 `NEXT_PUBLIC_SITE_URL` 을 그 주소로 바꾸고 **다시 배포**합니다.

---

## 6. 운영

### 바로가기 추가·수정

**Notion 표만 고치면 됩니다.** 재배포는 필요 없습니다.

다만 서비스가 Notion을 매번 읽지 않고 **5분 주기로 모아서 읽기** 때문에 즉시 반영되지는
않습니다 (Notion에 초당 요청 한도가 있습니다).

| Notion에서 한 일 | 반영까지 |
|---|---|
| 기존 줄의 주소·제목·설명 수정 | 최대 5분 |
| `Enabled` → `Disabled`, 줄 삭제 | 최대 5분 |
| 새 줄 추가 | 보통 5분, 드물게 최대 10분 |
| 속성 이름·타입 변경 | 이름을 되돌리거나 코드 수정 필요 → [7. 문제 해결](#7-문제-해결) |

### 잠시 내리기

줄을 지우지 말고 `Enabled` 를 **`Disabled`** 로 바꿔 주세요. 되돌리기 쉽고, 그동안 그 키는
"존재하지 않는 바로가기"로 안내됩니다.

### 키 길이

`a`, `go` 처럼 1~2자 키는 찍어서 맞힐 수 있습니다. 내부 문서 주소를 담는다면 추측하기 어려운
이름을 쓰시는 편이 좋습니다.

검색엔진에는 노출되지 않도록 해 두었지만(모든 페이지 `noindex`, `robots.txt` 차단, 바로가기
목록 비공개), **키를 아는 사람은 누구나 볼 수 있습니다.**

---

## 7. 문제 해결

### 모든 키가 "존재하지 않는 바로가기"로 나옵니다

대개 [3번 3단계](#3-notion-연결하기)(표에 인테그레이션 연결)를 빠뜨린 경우입니다.

정확한 원인은 Vercel의 **Deployments** → 해당 배포 → **Runtime Logs** 에 찍힙니다.

| 로그에 보이는 말 | 뜻 | 할 일 |
|---|---|---|
| `object_not_found` | 표에 인테그레이션이 연결되지 않음 | `⋯` → Connections 에서 추가 |
| `NOTION_TOKEN is invalid` | 토큰이 틀림 | 시크릿을 다시 복사해 넣기 |
| `Notion rejected the query` | 속성 이름·타입이 다름 | 로그에 적힌 속성 확인 |
| `rate limited` | 요청이 너무 많음 | 잠시 후 자동 회복 |

### 특정 키만 안 열립니다

1. `Enabled` 가 `Enabled` 로 선택돼 있는지 (비어 있으면 꺼진 상태입니다)
2. `Key` 앞뒤에 공백이 없는지
3. `URL` 이 `http://` 또는 `https://` 로 시작하는지
4. 방금 추가했다면 5분쯤 기다렸는지

### 미리보기 이미지가 안 나옵니다

**정상 동작입니다.** 목적지가 미리보기 이미지를 제공하지 않거나 외부 사용을 막아둔 경우이며,
이미지 자리에 주소가 대신 표시됩니다. 실제로 이미지가 있는 사이트도 절반 정도만 성공하는 것이
보통이고, 목적지의 HTTPS가 준비되지 않은 경우에도 나오지 않습니다.

### 같은 키가 두 줄에 있습니다

먼저 나온 줄이 쓰이고 로그에 경고가 남습니다. 중복을 정리해 주세요.

---

## 8. 문구·이름 바꾸기

`site.config.ts` 한 파일만 고치고 GitHub에 올리면, Vercel이 자동으로 다시 배포합니다.

```ts
export const CONFIG = {
  title: "CHEONGSANDO",                    // 헤더 로고, 브라우저 탭 제목
  description: "바로가기 키를 입력하면…",   // 검색 결과용 설명
  lang: "ko-KR",
  blogUrl: "https://cheongsan.com",        // 로고를 누르면 가는 곳
  notFoundMessage: "존재하지 않는 바로가기 키입니다.",
} as const
```

화면 색·글꼴은 [`app/globals.css`](app/globals.css) 위쪽에 모여 있습니다.

---

## 9. 내 컴퓨터에서 실행해 보기

배포에는 필요하지 않습니다. 미리 확인해 보고 싶을 때만 보시면 됩니다.

**Node 24** 가 필요합니다.

1. 준비

   ```bash
   nvm use        # .nvmrc = 24.18.0
   npm install
   ```

2. Notion 값 채우기

   ```bash
   cp .env.example .env.local     # 파일을 열어 값 채우기
   ```

   [3번](#3-notion-연결하기)에서 챙긴 `NOTION_TOKEN` 과 `NOTION_DATABASE_ID` 를 넣습니다.
   **값이 없으면 실행되지 않습니다.**

3. 실행

   ```bash
   npm run dev    # http://localhost:3000
   ```

> `nvm` 을 찾을 수 없다면 `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"` 를 먼저
> 실행해 주세요. Node 16 같은 낮은 버전에서는 `npm install` 이 바로 실패합니다.

<details>
<summary>그 외 명령</summary>

```bash
npm test        # 자동 테스트
npm run build   # 배포와 같은 방식으로 빌드
npm run lint
```

</details>

---

## 라이선스

Private.
