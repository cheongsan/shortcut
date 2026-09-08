import { Noto_Sans_KR, Red_Hat_Display } from "next/font/google"

/** Latin. Variable font, so omitting `weight` serves 300/500/700/900 from one
 *  file. The blog loaded this through a chained Google Fonts @import, which is
 *  render-blocking; next/font self-hosts with a metric-matched fallback. */
export const redHatDisplay = Red_Hat_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-red-hat-display",
})

/** Korean. Also variable.
 *
 *  preload: false is deliberate. The Korean subset is sliced into dozens of
 *  unicode-range chunks; preloading injects a <link rel=preload> for every one
 *  of them, flooding <head> and competing with the LCP. With preload off the
 *  unicode-range mechanism still means the browser fetches only the slices the
 *  page actually needs. */
export const notoSansKR = Noto_Sans_KR({
  // `subsets` is deliberately omitted. Google's metadata for this family does
  // not declare a "korean" subset -- next/font's type only allows
  // latin/latin-ext/cyrillic/vietnamese -- so naming a subset would keep only
  // those unicode-range blocks and drop the ones carrying Hangul, leaving
  // Korean text on a system fallback. With no subsets every range is kept, and
  // preload:false is what stops that becoming dozens of preload links.
  display: "swap",
  preload: false,
  variable: "--font-noto-sans-kr",
})

/* No Noto_Color_Emoji: next/font would self-host a ~10MB COLRv1 file, which
   cannot be justified on a page whose entire purpose is to leave. The system
   emoji families are plain names in --font-sans instead, so glyphs differ per
   platform. Accepted. */
