# 작업 안내

이 저장소에서 코드를 고칠 때 필요한 것들. 배포·운영은 [README](README.md)를 보세요.

여기 적힌 결정 대부분은 대안을 실제로 재보고 고른 것입니다. **되돌리기 전에 근거를 먼저
확인해 주세요.**

---

## 개발 환경

**Node 22 필수.** `next@16`은 `>= 20.9.0`을 요구하고 `package.json`의 `engines`가 `22.x`로
고정돼 있어, 낮은 버전에서는 `npm install`이 바로 실패합니다.

```bash
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh" && nvm use   # .nvmrc = 22.14.0
npm install
```

> 이 환경의 기본 `node`는 `/usr/local/bin/node`(v16)입니다. nvm이 셸에 자동 로드되지 않으므로
> **위처럼 source한 뒤에야** v22가 잡힙니다. `npm`·`npx`·`next` 모두 그 셸에서 실행해야 합니다.

## 명령

```bash
npm run dev        # http://localhost:3000
npm test           # 단위 테스트 (node --experimental-strip-types)
npm run typecheck  # next typegen && tsc --noEmit
npm run lint       # eslint . (next lint 는 Next 16에서 제거됨)
npm run build
npm run notion:datasource   # NOTION_DATA_SOURCE_ID 값 출력
```

`npm run typecheck`는 `next typegen`을 먼저 돌립니다. `PageProps` 같은 전역 생성 타입이
없으면 맨 `tsc`가 유령 에러를 뱉기 때문입니다.

**Notion 없이도 전부 동작합니다.** `NOTION_TOKEN`이 없으면 [lib/fixtures.ts](lib/fixtures.ts)가
데이터를 대신하므로 화면 작업에는 자격증명이 필요 없습니다. `npm run build`도 자격증명 없이
성공해야 합니다 — 환경변수 하나가 빠졌을 때 런타임 저하가 아니라 **빌드가 깨지는 것**을 막기
위한 의도입니다.

픽스처는 각각 다른 경로를 확인하기 위해 있습니다: `blog`는 `og:image`가 **실제로 없는**
목적지(플레이스홀더 경로), `gh`는 실제 OG 이미지, `nodesc`·`notitle`은 빈 필드 폴백.

### OG 파서를 로컬에서 테스트하기

[lib/url.ts](lib/url.ts)의 가드가 루프백을 막기 때문에 로컬 픽스처 서버(`127.0.0.1`)를 향한
스크래핑은 기본적으로 차단됩니다. 개발 중에만 열 수 있습니다:

```bash
ALLOW_LOCAL_OG_TARGETS=1 npm run dev
```

`NODE_ENV !== "production"`으로 이중 잠겨 있어 프로덕션에서는 이 변수만으로 열리지 않습니다.

## 파일 구조

| 경로 | 역할 |
|---|---|
| [app/globals.css](app/globals.css) | 팔레트·토큰·시그니처 인터랙션. 색을 바꾸려면 여기 |
| [app/[key]/page.tsx](app/[key]/page.tsx) | 확인 화면. ISR 설정, 대소문자 정규화, 404 처리 |
| [lib/shortcuts.ts](lib/shortcuts.ts) | 스냅샷 캐시, 중복·별칭 해석 |
| [lib/notion.ts](lib/notion.ts) | Notion 클라이언트, 페이지네이션, 오류 분류 |
| [lib/notion-props.ts](lib/notion-props.ts) | 순수 속성 리더 (테스트 대상) |
| [lib/og.ts](lib/og.ts) | 목적지 `og:image` 추출 |
| [lib/url.ts](lib/url.ts) | URL·IP 검증 |
| [lib/key.ts](lib/key.ts) | 키 정규화·허용 문자셋 |
| [site.config.ts](site.config.ts) | 사이트 문구·이름 |

---

## 건드리기 전에 알아야 하는 것

### 보안 경계는 "누가 이 Notion DB를 편집할 수 있는가"다

확인 카드는 목적지의 OG 썸네일과 제목을 보여준다. 그래서 이 화면은 **아무 장식 없는
리다이렉트보다 더 그럴듯한 피싱 표면**이다. 그 점을 감안해:

- 목적지 **호스트명을 스크랩 콘텐츠가 아닌 위치에 또렷하게** 표시한다.
- 목적지 URL은 데이터 계층에서 프로토콜을 검증한다. Notion의 URL 속성은 스킴을
  검증하지 않으므로 `javascript:`도 값으로 들어갈 수 있고, 그대로 `<a href>`에 닿으면
  클릭 시 XSS가 된다. `http`/`https`가 아닌 행은 없는 것으로 취급한다.
- 이동 링크는 `rel="noopener noreferrer nofollow"`이고 같은 탭에서 열린다.

이 저장소의 코드가 아니라 **DB 편집 권한**이 실질적인 신뢰 경계다.

### 키 형식이 방어 장치다

`Key`는 `^[a-z0-9][a-z0-9_-]{0,63}$`만 허용한다. **점을 막는 것이 핵심이다.**
덕분에 `favicon.ico`, `robots.txt`, `.env`, `wp-login.php` 같은 스캐너 탐침이
**Notion 조회 없이** 즉시 거절된다. Notion 한도는 평균 초당 3요청이라, 이게 없으면
스캐너 한 대가 사이트를 429로 만든다.

denylist로는 이 목록을 다 열거할 수 없다. 허용 문자셋이 공짜로 전부 잡는다.

키 비교는 `trim` → NFC 정규화 → 소문자 순으로 우리 코드에서 한다. Notion의 서버측
`title` 필터에 의존하지 않는 이유는 두 가지다: 그 필터가 API `2025-09-03`에서
지원되는지 문서가 엇갈리고, 텍스트 `equals`의 대소문자 구분 여부가 문서화돼 있지 않다.
게다가 macOS에서 붙여넣은 NFD 한글은 바이트 비교가 조용히 실패한다.

### 인덱싱과 키 유출

- `robots.txt`는 `/`만 허용하고 나머지를 거부한다. **사이트맵은 만들지 않는다** —
  만들면 바로가기 목록을 공개하는 셈이다.
- 모든 페이지가 `noindex`이고, 없는 키는 진짜 **404**를 반환한다. 404를 반환하는 이유는
  200을 주면 크롤러가 무한한 쓰레기 URL을 정상 페이지로 색인하고, 링크 체커·모니터링이
  깨진 바로가기를 정상으로 보고하기 때문이다.
- 전역 `Referrer-Policy: no-referrer`. 이게 없으면 목적지의 액세스 로그에
  `https://<우리도메인>/{key}`가 남아 바로가기 키가 제3자에게 새어 나간다.

### 썸네일에 이미지 프록시를 쓰지 않는 이유

`og:image` URL은 **목적지 사이트가 정한다.** 서버가 그 URL을 가져와 클라이언트에
되돌려주는 프록시를 두면, 악성 목적지가 `og:image`를 내부 주소로 지정해
**응답 본문을 유출시키는 읽기 SSRF**가 된다.

그래서 서버는 `og:image` URL을 **검증만** 하고(https + 공개 호스트 + SVG 배제 +
HEAD 도달 확인), 브라우저가 `<img>`로 직접 가져간다. 대가는 목적지 이미지 호스트가
방문자 IP를 보는 것인데, 어차피 한 번 클릭하면 가는 곳이므로 수용했다.

`next/image`도 쓰지 않는다 — 임의 호스트를 허용하려면 `remotePatterns`를 `**`로 열어야
하고 그러면 이미지 최적화기가 오픈 프록시가 된다. 게다가 그 캐시는 무효화할 수 없고
우리는 한 가지 크기로만 그리므로 얻는 것도 없다.

프라이버시를 더 원하면 이 결정만 뒤집으면 되지만, 그때는 **매 리다이렉트 홉마다 SSRF
재검증 + content-type 허용목록 + 스트리밍 바이트 상한**이 필수다.

**남는 위험:** `lib/url.ts`의 검사는 호스트명·IP 리터럴 기준이라 *공개 도메인이 사설 IP로
해석되는* 경우(`10.0.0.1.nip.io`, DNS 리바인딩)를 막지 못한다. **의도적으로 여기서 멈췄다.**
목적지 URL은 Notion을 편집할 수 있는 사람만 넣을 수 있으므로 현실적 위협은 "소유자가 내부
호스트명을 실수로 붙여넣었다"이고, 응답 본문을 클라이언트에 돌려주지도 않으며(URL 하나만
뽑는다) 요청 경로가 아니라 캐시 재검증 시점에만 일어난다.

### 캐싱

전체 표를 한 번에 읽어 스냅샷 하나로 캐시한다(`unstable_cache`, 태그 `shortcuts`,
`revalidate` 300초). 키마다 Notion을 조회하면 무한한 키 공간 × 초당 3요청 한도 때문에
`/{랜덤}`을 몇 번 때리는 것만으로 정상 사용자까지 막힌다. 스냅샷 방식에서는
**없는 키 조회 비용이 외부 호출 0회**다.

태그는 `shortcuts` **하나**다. 키별 태그(`shortcut:{key}`)는 카디널리티가 무한하고,
**이름 변경·삭제를 무효화할 수 없다** — `docs`를 `documents`로 바꾸면 아무도
`shortcut:docs`를 무효화해 주지 않아 옛 키가 계속 산다.

`og:image` 해석도 이 재검증 시점에만 일어난다. 요청 시점에 하면 인기 링크 하나가
목적지 사이트를 DDoS한다.

Notion 장애 시에는 stale 스냅샷을 계속 서빙해 장애가 사용자에게 보이지 않게 한다.
"존재하지 않는 바로가기"와 "일시적인 오류"는 **다른 화면**이다 — 전자를 보여주면
사용자가 정상 행을 지우고 다시 만드는 잘못된 조치를 하게 된다.

`cacheComponents`는 **의도적으로 끈다.** 켜면 `export const revalidate`가 에러가 되고,
`generateStaticParams`가 최소 1개를 반환해야 해서 빌드가 Notion 자격증명과 네트워크를
요구하게 되며, `use cache`의 기본 핸들러는 인메모리라 서버리스에서 인스턴스 간에
보존되지 않는다(= 거의 모든 요청이 Notion을 친다).

`unstable_cache` 엔트리는 **배포를 넘어 유지된다.** 그래서 Notion을 고친 뒤 재배포해도
300초 창 안에서는 같은 데이터가 나온다. README에 이 점을 명시해 두었다.

---

## 함정

### 로고 shimmer의 토큰 이름

blog **저장소**의 `Logo.tsx`에는 이 효과가 없다 — 배포된 사이트에서 읽어 옮겼다.
`background-clip: text` + `-webkit-text-fill-color: transparent` 조합으로 글자에
그라데이션을 칠하고 200% 폭을 훑는다. `#7ec8e3`은 blog에서도 팔레트 토큰이 아니라 리터럴.

blog의 그라데이션은 `var(--nav-logo)`를 참조하지만 **우리 팔레트에서는 `--logo`로
개명됐다.** 잘못 참조하면 정의되지 않은 `var()` 때문에 shorthand 전체가 computed-value
시점에 무효가 되어 `background-image`가 `none`이 되는데,
`-webkit-text-fill-color: transparent`는 그대로 적용되므로 **로고가 통째로 사라진다.**
`var(--logo, currentColor)` 폴백으로 막아 두었다.

### shimmer를 켜는 방법

App Router에는 라우터 이벤트 API가 없고 `useLinkStatus()`는 자기 `<Link>` 안에서만
동작하므로, 로딩을 일으키는 쪽이 직접 알린다. 폼은 `pending`을 **미러링**한다 —
없는 키는 오류만 반환하고 페이지에 머무를 수 있어서, 한 방향 트리거면 로고가 영구히
반짝인다.

### `server-only` 때문에 테스트할 수 없는 모듈

`lib/notion.ts`는 `server-only`를 import해 테스트에서 불러올 수 없다. 그래서 순수한
속성 리더만 [lib/notion-props.ts](lib/notion-props.ts)로 분리했다. Notion 관련 순수 함수를
추가할 때는 그쪽에 두면 테스트할 수 있다.

### URL 파서의 정규화 범위

가장 값이 높은 테스트 파일은 [test/url.test.ts](test/url.test.ts)다. Node의 WHATWG URL
파서가 10진(`2130706433`)·8진(`0177.0.0.1`)·단축(`127.1`) IPv4를 이미 정규화하므로
추가 파싱이 불필요하다는 것, 그러나 **IPv4-mapped IPv6는 16진으로 바뀌어**
(`::ffff:7f00:1`) 문자열 검사로 잡히지 않는다는 것, 호스트명 끝점(`localhost.`)이
살아남는다는 것을 모두 케이스로 고정해 두었다.

### Next 16 관련

- `params`는 **Promise**다. 손으로 타입을 쓰지 말고 전역 생성 타입
  (`PageProps<'/[key]'>`)을 쓴다.
- `next lint`가 제거됐다. `eslint.config.mjs`는 `eslint-config-next`의 **네이티브 flat
  config**를 직접 import한다. `@eslint/eslintrc`의 `FlatCompat`으로 감싸면 순환 참조로
  크래시한다.
- Tailwind 4는 PostCSS 플러그인이 `@tailwindcss/postcss`로 분리됐고 `tailwind.config.ts`가
  없다. `autoprefixer`·`postcss-import`는 넣지 않는다 (Lightning CSS가 처리).
- `favicon.ico`는 `app/`이 아니라 **`public/`에 둔다.** `app/` 메타데이터 파일로 두면 Next가
  크기를 읽으려다 이 256×256 PNG-압축 ICO를 디코드하지 못해 매 렌더마다 오류를 낸다.

### 폰트

`Noto_Sans_KR`에 **`subsets`를 지정하지 않는다.** Google 메타데이터가 `korean` 서브셋을
선언하지 않아 next/font 타입이 거부하는데, `latin`만 지정하면 한글 unicode-range 블록이
빠져 시스템 폰트로 폴백된다. 서브셋을 비우면 전 범위가 유지되고, `preload: false`가
수십 개 preload 링크로 불어나는 것을 막는다.

`Noto_Color_Emoji`는 쓰지 않는다. `next/font`로 받으면 ~10MB를 자체 호스팅하는데,
떠나는 것이 목적인 페이지에서 정당화할 수 없다.

---

## blog에서 가져온 것 / 안 가져온 것

가져온 것은 **스타일뿐**이다: 팔레트(`--page`/`--panel`/`--pill`…), Radix gray 계조,
Red Hat Display + Noto Sans KR 조합, 그리고 무엇보다
**hover 시 `scale: .97`로 줄어드는 시그니처 인터랙션**.

데이터 계층은 재사용하지 않았다. blog는 비공식 `notion-client`로 표 전체를 통째로
받는데, 그 코드의 `getAllPageIds`는 뷰의 첫 페이지만 읽어 행이 50~70개를 넘으면
**조용히 누락**되고, `revalidate`가 42시간이며, 재검증 시크릿을 쿼리스트링으로 받는다.

### 의도적으로 바꾼 것

- **다크모드 CTA 대비.** blog의 `--card-link-alt` 다크 값은 `--card`와 색이 같아서,
  카드 위에 놓인 이동 버튼이 hover 전까지 보이지 않는다. 이 페이지에서는 버튼을 누르는
  것이 전부이므로 고대비(`bg-fg`/`text-page`)로 올렸다.
- **14px 텍스트 계조.** blog는 메타 텍스트에 Radix gray 10단을 쓰는데 라이트·다크
  양쪽에서 WCAG AA 미달(3.69:1 / 4.15:1)이다. 읽어야 하는 문자열은 11단
  (5.03:1 / 6.44:1)을 쓴다.
- **다크 `--danger` 명도.** 59%면 패널 위에서 4.30:1로 AA 미달이라 64%(4.97:1)로 올렸다.
- **`@radix-ui/colors` 의존을 걷어냈다.** 그 패키지는 다크 값을 `.dark-theme`에 싣는데
  next-themes는 `.dark`를 쓴다. blog는 그 간극을 `useEffect`로 메워서 다크모드 FOUC가
  생긴다. 쓰는 값 6개만 인라인하면 사라진다.
- 전역 `a, button, input { all: unset }`을 쓰지 않는다. blog는 이 리셋 때문에 자기
  `ui/input.tsx`를 못 쓰고 입력창을 따로 만들었다.
- 푸터를 없애고 테마 토글을 패널 아래로 옮겼다 (blog의 푸터에는 `position: sticky`가
  잘못 붙어 있다).
- `hover:`가 `@media (hover: hover)`로 컴파일되므로, 휴대폰에서 탭한 뒤 카드가 줄어든
  채 남는 blog의 동작이 고쳐진다. 터치 피드백은 `active:`로 준다.
- `prefers-reduced-motion`에서 축소와 로고 shimmer 애니메이션을 끈다.

## 프리미티브를 직접 만든 이유

`shadcn add button input`을 먼저 시도했으나, 생성된 코드가
`class-variance-authority`를 **설치 없이 import**해 빌드가 깨졌고, 설정한
`@/lib/utils` 별칭을 무시하고 서드파티 `cn` 패키지를 쓰며 `radix-ui` 엄브렐라까지
끌어왔다 — 요소 두 개에 약 1.4MB. 필요한 건 버튼 한 종류와 입력창 한 종류뿐이라
직접 작성했다.

다만 shadcn 토큰(`--color-background`, `--color-primary` …)은
[app/globals.css](app/globals.css)에 우리 팔레트로 매핑해 두었다. 나중에 누가
`shadcn add`를 하면 생성된 클래스가 **우리 색으로** 해석된다. 서로 모르는 두 시스템이
공존하는 것이 정확히 blog가 실패한 지점이다.
