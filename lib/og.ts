import "server-only"
import { safeHttpUrl, safeImageUrl } from "./url"

/** Extracts a destination's og:image.
 *
 *  Scope note: ONLY the image. Title and description come from Notion, never
 *  from scraping -- the plan's earlier draft fell back to a scraped og:title,
 *  which would put a third-party HTML fetch (up to the timeout) on the first
 *  render of every key, on top of the Notion read, for a fallback that only
 *  fires when the author left a field blank. Not scraping text also removes the
 *  whole charset-detection bug class (Korean sites still serve euc-kr).
 *
 *  This runs during snapshot revalidation, not on a user's request path. Doing
 *  it per-request would mean one popular link fanning out into a DDoS of the
 *  destination.
 *
 *  Behaviour below is derived from actually fetching four real sites
 *  (github.com, cheongsan.com, notion.so, vercel.com), not from assumption:
 *
 *  1. Attribute order is not dependable. Both `property=... content=...` and
 *     `content=... property=...` occur, and a third attribute can sit between
 *     them (notion.so emits `data-next-head=""`).
 *  2. Document order is not dependable either. GitHub emits `twitter:image`
 *     BEFORE `og:image`, so "first match wins" picks the wrong one. Collect
 *     everything, then choose by name priority.
 *  3. Keys must match exactly: a prefix match on `og:image` would happily
 *     return the value of `og:image:width`.
 *  4. og:image is genuinely absent on real sites -- cheongsan.com, the user's
 *     own blog, has none. The placeholder is a common path, not an edge case.
 */

const TIMEOUT_MS = 3_000
const MAX_REDIRECTS = 3
const MAX_HTML_BYTES = 512 * 1024
const UA = "Mozilla/5.0 (compatible; cheongsando-shortcut/1.0; +https://cheongsan.com)"

/** In name-priority order, not document order. */
const IMAGE_KEYS = [
  "og:image",
  "og:image:url",
  "og:image:secure_url",
  "twitter:image",
  "twitter:image:src",
]

/** Follows redirects by hand.
 *
 *  `redirect: "follow"` cannot be used: WHATWG fetch follows up to 20 hops and
 *  exposes no cap, so neither MAX_REDIRECTS nor a per-hop safety re-check is
 *  possible. A `302 Location: http://169.254.169.254/` would otherwise be
 *  followed without a second thought. */
async function fetchFollowing(
  start: URL,
  accept: string,
  method: "GET" | "HEAD"
): Promise<{ response: Response; finalUrl: URL } | null> {
  let current = start

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let response: Response
    try {
      response = await fetch(current, {
        method,
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: {
          "user-agent": UA,
          accept,
          // Count decompressed bytes, not compressed ones: a 4MB gzip that
          // inflates to 4GB would sail past a byte cap applied to the wire size.
          "accept-encoding": "identity",
        },
      })
    } catch {
      return null // timeout, DNS failure, TLS failure, connection refused
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location")
      await response.body?.cancel()
      if (!location) return null

      let next: string
      try {
        next = new URL(location, current).toString()
      } catch {
        return null
      }
      // Re-validate EVERY hop, not just the URL we started from.
      const safe = safeHttpUrl(next)
      if (!safe) return null
      current = safe
      continue
    }

    return { response, finalUrl: current }
  }

  return null // too many redirects
}

/** Reads at most MAX_HTML_BYTES and stops as soon as </head> is in the buffer. */
async function readHead(response: Response): Promise<string> {
  const body = response.body
  if (!body) return ""

  const reader = body.getReader()
  const decoder = new TextDecoder("utf-8")
  let html = ""
  let bytes = 0

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        // Cap on accumulated bytes as we stream: Content-Length can lie, and
        // omitting it entirely (chunked) would bypass a header-based check.
        bytes += value.byteLength
        html += decoder.decode(value, { stream: true })
        if (bytes >= MAX_HTML_BYTES) break
        if (/<\/head\s*>/i.test(html)) break
      }
    }
  } catch {
    // keep whatever we already decoded
  } finally {
    await reader.cancel().catch(() => {})
  }

  const headEnd = html.search(/<\/head\s*>/i)
  return headEnd === -1 ? html : html.slice(0, headEnd)
}

function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    )
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&") // last, so &amp;lt; does not become <
}

/** Collects every meta name/property into a map, so the caller can choose by
 *  priority rather than by whichever tag the page happened to emit first. */
export function parseMetaTags(head: string): Map<string, string> {
  const found = new Map<string, string>()
  const attr = (tag: string, names: string[]): string | null => {
    for (const name of names) {
      const re = new RegExp(
        `\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`,
        "i"
      )
      const m = re.exec(tag)
      if (m) return m[1] ?? m[2] ?? m[3] ?? null
    }
    return null
  }

  for (const m of head.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = m[0]
    // `property` first (Open Graph), then `name` (Twitter and friends). Reading
    // both, independently of where they sit in the tag, is what makes attribute
    // order irrelevant.
    const key = attr(tag, ["property", "name"])
    const content = attr(tag, ["content"])
    if (!key || content === null) continue
    const normalized = key.trim().toLowerCase()
    // First occurrence of a given key wins; priority across keys is the
    // caller's business.
    if (!found.has(normalized)) found.set(normalized, decodeEntities(content))
  }

  return found
}

/** Chooses an image URL from collected meta tags, by name priority. */
export function pickImage(
  meta: Map<string, string>,
  base: URL
): string | null {
  for (const key of IMAGE_KEYS) {
    const raw = meta.get(key)
    if (!raw?.trim()) continue
    let absolute: string
    try {
      // Resolve against the FINAL url after redirects, not the requested one.
      absolute = new URL(raw.trim(), base).toString()
    } catch {
      continue
    }
    const safe = safeImageUrl(absolute)
    if (safe) return safe.toString()
  }
  return null
}

/** Resolves a destination's og:image, or null.
 *
 *  Never throws. A 403 from a bot wall, a client-rendered SPA with no
 *  server-side tags, and a timeout are all normal outcomes -- expect a hit rate
 *  around 50-70% and make the placeholder good rather than the scraper heroic. */
export async function resolveOgImage(destination: string): Promise<string | null> {
  const start = safeHttpUrl(destination)
  if (!start) return null

  const page = await fetchFollowing(start, "text/html,*/*;q=0.8", "GET")
  if (!page || !page.response.ok) {
    await page?.response.body?.cancel().catch(() => {})
    return null
  }

  const contentType = page.response.headers.get("content-type") ?? ""
  if (!/^text\/html|^application\/xhtml\+xml/i.test(contentType)) {
    await page.response.body?.cancel().catch(() => {})
    return null
  }

  const head = await readHead(page.response)
  const candidate = pickImage(parseMetaTags(head), page.finalUrl)
  if (!candidate) return null

  // Confirm the image is actually reachable now, so we store null instead of a
  // URL that 404s at request time and renders a broken-image glyph.
  return (await imageIsReachable(candidate)) ? candidate : null
}

async function imageIsReachable(imageUrl: string): Promise<boolean> {
  const url = safeImageUrl(imageUrl)
  if (!url) return false

  const head = await fetchFollowing(url, "image/*", "HEAD")
  if (!head) return false
  await head.response.body?.cancel().catch(() => {})

  if (!head.response.ok) return false
  const type = head.response.headers.get("content-type") ?? ""
  // Allowlist, not startsWith("image/"): image/svg+xml is script execution
  // wherever it ends up rendered.
  return /^image\/(png|jpeg|jpg|webp|avif|gif)\b/i.test(type)
}
