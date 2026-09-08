/** Site constants, following the blog's site.config.js convention but typed.
 *  Values match cheongsan/blog so the two sites read as one set. */
export const CONFIG = {
  title: "CHEONGSANDO",
  description: "바로가기 키를 입력하면 목적지를 확인한 뒤 이동합니다.",
  lang: "ko-KR",
  /** The blog repo's `homepage` field. */
  blogUrl: "https://cheongsan.com",
  /** Shown in the key form's hint line, and as the <title>, when a key misses.
   *  Kept here so the inline message and the page title cannot drift apart. */
  notFoundMessage: "존재하지 않는 바로가기 키입니다.",
} as const
