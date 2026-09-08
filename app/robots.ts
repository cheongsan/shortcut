import type { MetadataRoute } from "next"

/** `allow: "/$"` anchors on the root only, so the key box is crawlable and
 *  every /{key} interstitial is not.
 *
 *  There is deliberately no sitemap: publishing one would publish the shortcut
 *  list. Note that `noindex` alone would not be enough anyway -- a crawler has
 *  to fetch the page to see the meta tag, so it still costs an invocation. This
 *  plus the 404 status is what actually keeps them away.
 *
 *  Creating this file also stops /robots.txt from falling through to the
 *  [key] route. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/$", disallow: "/" }],
    host: process.env.NEXT_PUBLIC_SITE_URL,
  }
}
