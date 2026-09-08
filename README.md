# CHEONGSANDO Shortcut

Notion 데이터베이스를 저장소로 쓰는 바로가기 서비스.

`/{key}`로 접속하면 **바로 이동하지 않고** 목적지의 썸네일·제목·호스트를 먼저 보여주고,
사용자가 이동 버튼을 눌러야 이동한다. 키 없이 접속하면 키 입력 폼이 나온다.

스타일은 [cheongsan/blog](https://github.com/cheongsan/blog)를 따라 두 사이트가
한 세트로 보이게 맞췄다.

## 요구 사항

- **Node 22** (Next 16은 `>= 20.9.0`, shadcn CLI는 `>= 20.18.1`을 요구한다)

```bash
nvm use            # .nvmrc = 22.14.0
npm install
```

> nvm이 셸에 자동 로드되지 않으면 `export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"`를
> 먼저 실행한다. Node 16에서는 `npm install`이 `engines`로 실패한다.

## Notion 설정

### 1. 데이터베이스 만들기

새 데이터베이스를 만들고 속성을 **정확히 이 이름과 타입**으로 둔다.
이름이 하나라도 다르면 조회가 빈 결과가 아니라 `validation_error`로 실패하고,
서버 로그가 어떤 컬럼을 확인해야 하는지 알려준다.

| 속성 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `Key` | **Title** | ✅ | 바로가기 키. `^[a-z0-9][a-z0-9_-]{0,63}$` — **점(`.`)은 쓸 수 없다** |
| `URL` | **URL** | ✅ | 목적지. `http`/`https`만 |
| `Title` | Rich text | | 카드 제목. 비우면 호스트명이 쓰인다 |
| `Description` | Rich text | | 카드 설명 |
| `Enabled` | **Select** | ✅ | 옵션 `Enabled` / `Disabled`. `Enabled`가 아니면 없는 키로 취급 |
| `Aliases` | Multi-select | | 같은 목적지의 추가 키 |

주의할 점:

- `Enabled` 옵션 이름은 **`Enabled` / `Disabled` 두 개를 정확히 이 철자로** 만든다.
  Notion은 대소문자나 공백을 정규화하지 않으므로 `enabled`나 `Enabled ` 는 일치하지 않는다.
- **값을 고르지 않은 행은 비활성으로 취급한다.** select에는 체크박스에 없던 "비어 있음"
  상태가 있어서, 이걸 활성으로 보면 실수로 추가한 행이 그대로 공개된다.
  서버측 필터가 `select.equals: "Enabled"`이므로 `Disabled`와 미지정이 함께 걸러지고,
  [lib/notion-props.ts](lib/notion-props.ts)의 `isEnabled`가 같은 규칙을 한 번 더 확인한다.
  컬럼이 아직 체크박스인 경우에도 비활성으로 읽히므로, 타입을 바꾸는 도중에
  모든 바로가기가 공개되는 일은 없다.
- 키에 점을 쓸 수 없는 것은 의도된 제약이다. 그 덕분에 `favicon.ico`, `robots.txt`,
  `.env`, `wp-login.php` 같은 스캐너 탐침이 **Notion 조회 없이** 즉시 거절된다.
  Notion의 한도는 평균 초당 3요청이라, 이게 없으면 스캐너 한 대가 사이트를 429로 만든다.
- `Aliases`는 Notion 제약상 **옵션 이름에 쉼표를 넣을 수 없다.**
- 키 비교는 `trim` → NFC 정규화 → 소문자 순으로 우리 코드에서 한다. 그래서 제목 앞뒤 공백,
  대소문자, macOS에서 붙여넣은 NFD 한글이 조용히 실패하지 않는다.
- 같은 키가 두 행에 있으면 로드 시점에 경고를 남기고 첫 행을 쓴다.
  `Key`가 정확히 일치하는 행이 `Aliases` 일치보다 항상 우선한다.

### 2. 인테그레이션 연결

1. <https://www.notion.so/my-integrations>에서 내부 인테그레이션을 만든다
   (권한은 **Read content**만 있으면 된다).
2. 시크릿(`ntn_…`, 예전 것은 `secret_…`)을 `NOTION_TOKEN`에 넣는다.
3. **데이터베이스 페이지에서 `⋯` → `Connections` → 만든 인테그레이션을 추가한다.**

**3번을 빠뜨리는 것이 가장 흔한 실패다.** 공유는 자동이 아니다. 토큰이 유효해도
연결하지 않으면 Notion이 `object_not_found`를 돌려주는데, 실제로는 권한 문제인데
"없는 객체"라고 말하므로 오해하기 쉽다. 서버 로그에 이 안내가 함께 찍힌다.

### 3. data source id 찾기

Notion API `2025-09-03`부터는 데이터베이스가 아니라 **data source**를 쿼리한다.

```bash
cp .env.example .env.local   # NOTION_TOKEN, NOTION_DATABASE_ID 채우기
npm run notion:datasource
```

출력된 id를 `.env.local`의 `NOTION_DATA_SOURCE_ID`에 넣는다. 비워 두면 런타임에
`databases.retrieve`로 한 번 해석하지만, 콜드 스타트마다 왕복이 한 번 늘고
data source가 둘 이상이면 어느 것이 선택될지 보장되지 않는다.

## 개발

```bash
npm run dev         # http://localhost:3000
npm test            # 단위 테스트 (URL/IP 가드, 키 정규화)
npm run typecheck   # next typegen && tsc --noEmit
npm run lint
npm run build
```

**Notion 없이도 전부 동작한다.** `NOTION_TOKEN`이 없으면 `lib/fixtures.ts`가 데이터를
대신하므로 폼·확인 카드·썸네일 유무 분기·다크모드를 그대로 확인할 수 있다.
`npm run build`도 자격증명 없이 성공해야 한다 (환경변수 하나가 빠졌을 때 런타임 저하가
아니라 빌드가 깨지는 것을 막기 위한 의도다).

픽스처 중 `blog`는 `og:image`가 **실제로 없는** 목적지라 플레이스홀더 경로를,
`gh`는 실제 OG 이미지 경로를, `nodesc`/`notitle`은 빈 필드 폴백을 확인하기 위해 있다.

### OG 파서를 로컬에서 테스트하기

`lib/url.ts`의 가드가 루프백을 막기 때문에, 로컬 픽스처 서버(`127.0.0.1`)를 향한
스크래핑은 기본적으로 차단된다. 개발 중에만 열 수 있다:

```bash
ALLOW_LOCAL_OG_TARGETS=1 npm run dev
```

`NODE_ENV !== "production"`으로 이중 잠겨 있어 프로덕션에서는 이 변수만으로 열리지 않는다.

## 배포 (Vercel)

환경변수를 **Production / Preview / Development 모두**에 설정한다.
`NOTION_TOKEN`과 `NOTION_DATABASE_ID`는 빌드 시점에도 있어야 `generateStaticParams`가
실제 키를 프리렌더한다 (없으면 조용히 온디맨드 렌더로 내려간다 — 의도된 동작이다).

**Preview 배포는 공개이고 환경변수를 공유한다.** 프로덕션 도메인에 건 방어가
`*.vercel.app`으로 우회되므로 Preview에 Deployment Protection을 켜는 것을 권한다.

## 설계 노트

### 보안 경계는 "누가 이 Notion DB를 편집할 수 있는가"다

확인 카드는 목적지의 OG 썸네일과 제목을 보여준다. 그래서 이 화면은 **아무 장식 없는
리다이렉트보다 더 그럴듯한 피싱 표면**이다. 그 점을 감안해:

- 목적지 **호스트명을 스크랩 콘텐츠가 아닌 위치에 또렷하게** 표시한다.
- 목적지 URL은 데이터 계층에서 프로토콜을 검증한다. Notion의 URL 속성은 스킴을
  검증하지 않으므로 `javascript:`도 값으로 들어갈 수 있고, 그대로 `<a href>`에 닿으면
  클릭 시 XSS가 된다. `http`/`https`가 아닌 행은 없는 것으로 취급한다.
- 이동 링크는 `rel="noopener noreferrer nofollow"`이고 같은 탭에서 열린다.

이 저장소의 코드가 아니라 **DB 편집 권한**이 실질적인 신뢰 경계다.

### 인덱싱과 키 유출

- `robots.txt`는 `/`만 허용하고 나머지를 거부한다. **사이트맵은 만들지 않는다** —
  만들면 바로가기 목록을 공개하는 셈이다.
- 모든 페이지가 `noindex`이고, 없는 키는 진짜 **404**를 반환한다.
- 전역 `Referrer-Policy: no-referrer`. 이게 없으면 목적지의 액세스 로그에
  `https://<우리도메인>/{key}`가 남아 바로가기 키가 제3자에게 새어 나간다.
- 키를 2~3자로 짧게 짓지 않는 것이 좋다. 대입 공간이 좁으면 위 방어가 무의미해진다.

### 썸네일에 이미지 프록시를 쓰지 않는 이유

`og:image` URL은 **목적지 사이트가 정한다.** 서버가 그 URL을 가져와 클라이언트에
되돌려주는 프록시를 두면, 악성 목적지가 `og:image`를 내부 주소로 지정해
**응답 본문을 유출시키는 읽기 SSRF**가 된다.

그래서 서버는 `og:image` URL을 **검증만** 하고(https + 공개 호스트 + SVG 배제 +
HEAD 도달 확인), 브라우저가 `<img>`로 직접 가져간다. 대가는 목적지 이미지 호스트가
방문자 IP를 보는 것인데, 어차피 한 번 클릭하면 가는 곳이므로 수용했다.
`next/image`도 쓰지 않는다 — 임의 호스트를 허용하려면 `remotePatterns`를 `**`로 열어야
하고 그러면 이미지 최적화기가 오픈 프록시가 된다.

프라이버시를 더 원하면 이 결정만 뒤집으면 되지만, 그때는 **매 리다이렉트 홉마다 SSRF
재검증 + content-type 허용목록 + 스트리밍 바이트 상한**이 필수다.

### 캐싱

전체 표를 한 번에 읽어 스냅샷 하나로 캐시한다(`unstable_cache`, 태그 `shortcuts`,
`revalidate` 300초). 키마다 Notion을 조회하면 무한한 키 공간 × 초당 3요청 한도 때문에
`/{랜덤}`을 몇 번 때리는 것만으로 정상 사용자까지 막힌다. 스냅샷 방식에서는
**없는 키 조회 비용이 외부 호출 0회**다.

`og:image` 해석도 이 재검증 시점에만 일어난다. 요청 시점에 하면 인기 링크 하나가
목적지 사이트를 DDoS한다.

Notion 장애 시에는 stale 스냅샷을 계속 서빙해 장애가 사용자에게 보이지 않게 한다.
"존재하지 않는 바로가기"와 "일시적인 오류"는 **다른 화면**이다 — 전자를 보여주면
사용자가 정상 행을 지우고 다시 만드는 잘못된 조치를 하게 된다.

`cacheComponents`는 **의도적으로 끈다.** 켜면 `export const revalidate`가 에러가 되고,
`generateStaticParams`가 최소 1개를 반환해야 해서 빌드가 Notion 자격증명과 네트워크를
요구하게 되며, `use cache`의 기본 핸들러는 인메모리라 서버리스에서 인스턴스 간에
보존되지 않는다(= 거의 모든 요청이 Notion을 친다).

### blog에서 가져온 것 / 안 가져온 것

가져온 것은 **스타일뿐**이다: 팔레트(`--page`/`--panel`/`--pill`…), Radix gray 계조,
Red Hat Display + Noto Sans KR 조합, 1120px 셸, 그리고 무엇보다
**hover 시 `scale: .97`로 줄어드는 시그니처 인터랙션**.

의도적으로 바꾼 것:

- **다크모드 CTA 대비.** blog의 `--card-link-alt` 다크 값은 `--card`와 색이 같아서,
  카드 위에 놓인 이동 버튼이 hover 전까지 보이지 않는다. 이 페이지에서는 버튼을 누르는
  것이 전부이므로 고대비(`bg-fg`/`text-page`)로 올렸다.
- **14px 텍스트 계조.** blog는 메타 텍스트에 Radix gray 10단을 쓰는데 라이트·다크
  양쪽에서 WCAG AA 미달(3.69:1 / 4.15:1)이다. 읽어야 하는 문자열은 11단
  (5.03:1 / 6.44:1)을 쓴다.
- **`@radix-ui/colors` 의존을 걷어냈다.** 그 패키지는 다크 값을 `.dark-theme`에 싣는데
  next-themes는 `.dark`를 쓴다. blog는 그 간극을 `useEffect`로 메워서 다크모드 FOUC가
  생긴다. 쓰는 값 6개만 인라인하면 사라진다.
- 전역 `a, button, input { all: unset }`을 쓰지 않는다. blog는 이 리셋 때문에 자기
  `ui/input.tsx`를 못 쓰고 입력창을 따로 만들었다.
- 푸터에 `position: sticky`를 붙이지 않는다 (blog의 복붙 실수).
- `hover:`가 `@media (hover: hover)`로 컴파일되므로, 휴대폰에서 탭한 뒤 카드가 줄어든
  채 남는 blog의 동작이 고쳐진다. 터치 피드백은 `active:`로 준다.
- `prefers-reduced-motion`에서 축소를 끈다.
- 이모지는 시스템 폰트를 쓴다. `Noto_Color_Emoji`를 `next/font`로 받으면 ~10MB를
  자체 호스팅하는데, 떠나는 것이 목적인 페이지에서 정당화할 수 없다.

## 라이선스

Private.
