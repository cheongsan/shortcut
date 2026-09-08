/** Shortcut key normalization and validation.
 *
 *  Both halves matter and both are ours, not Notion's: the plan deliberately
 *  does not depend on Notion's server-side `title` filter, whose availability
 *  under API 2025-09-03 is disputed in the docs and whose case sensitivity is
 *  undocumented. We normalize on both sides of the comparison instead. */

/** No dots. This single decision is what makes every crawler and scanner probe
 *  free: favicon.ico, robots.txt, sitemap.xml, sw.js, apple-touch-icon.png,
 *  .env, wp-login.php, index.php all fail it and never reach a lookup. A
 *  denylist could not enumerate them, and each miss would otherwise cost a
 *  Notion call against a ~3 req/s limit -- one scanner would 429 the site. */
const KEY_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/

/** Single-segment names that have no dot and so would pass KEY_RE, but which
 *  Next or a future route owns. */
const RESERVED = new Set(["api", "_next", "icon", "opengraph-image", "static"])

/** Canonical form used for every comparison, on both the URL side and the
 *  Notion side.
 *
 *  - trim():        a Notion title trivially picks up a trailing space, and the
 *                   row still looks correct to a human.
 *  - normalize NFC: text pasted from some macOS sources is NFD, so a Korean key
 *                   fails a byte comparison with no visible cause
 *                   ("한글".normalize("NFD") !== "한글").
 *  - toLowerCase(): routing is case-sensitive, so /Docs and /docs would
 *                   otherwise be two different keys and two ISR entries. */
export function normalizeKey(raw: string): string {
  return raw.trim().normalize("NFC").toLowerCase()
}

export function isValidKey(key: string): boolean {
  return KEY_RE.test(key) && !RESERVED.has(key)
}

/** Normalize, then validate. Returns null for anything unusable so callers can
 *  reject before any I/O. Decoding is attempted because a route param arrives
 *  percent-encoded. */
export function parseKey(raw: string | undefined | null): string | null {
  if (!raw) return null
  let candidate = raw
  try {
    candidate = decodeURIComponent(raw)
  } catch {
    // keep the raw form; a malformed escape will fail validation below
  }
  const key = normalizeKey(candidate)
  return isValidKey(key) ? key : null
}
