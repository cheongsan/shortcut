import "server-only"
import { unstable_cache } from "next/cache"
import { normalizeKey } from "./key"
import { MissingNotionConfigError, loadRowsFromNotion } from "./notion"
import type { Shortcut, ShortcutRow } from "./types"

/** ONE cache tag for the whole table, not one per key.
 *
 *  Per-key tags cannot invalidate a rename or a delete: change `docs` to
 *  `documents` in Notion and nothing ever calls revalidateTag("shortcut:docs"),
 *  so the old key keeps resolving. Their cardinality is also unbounded, since
 *  the key space is attacker-chosen. */
export const SHORTCUTS_TAG = "shortcuts"

/** unstable_cache, not `use cache`.
 *
 *  `use cache` requires cacheComponents: true (which would make
 *  `export const revalidate` an error and force generateStaticParams to hit
 *  Notion at build time), and its default handler is in-memory, which on
 *  serverless does not persist across instances -- 30 concurrent cold requests
 *  would be 30 Notion queries. unstable_cache persists across instances and
 *  deploys. It is documented as being superseded by `use cache`, but it is
 *  still shipped in 16.3.4 and it is the only thing that actually caches here.
 *
 *  revalidate is 300s, not 60s: shortcut rows change monthly. The long window
 *  also means a Notion outage stays invisible while stale data is served. */
const loadSnapshot = unstable_cache(
  async (): Promise<ShortcutRow[]> => {
    return dedupe(await loadRowsFromNotion())
  },
  ["shortcuts-snapshot"],
  { revalidate: 300, tags: [SHORTCUTS_TAG] }
)

/** Duplicate keys are detected once, at load, rather than being resolved
 *  arbitrarily per request. Notion happily allows two rows titled `docs`, and
 *  without an explicit rule the winner would flip between revalidations. */
function dedupe(rows: ShortcutRow[]): ShortcutRow[] {
  const seen = new Map<string, ShortcutRow>()
  for (const row of rows) {
    if (!row.key) continue // a blank Notion Title; skip rather than crash
    const existing = seen.get(row.key)
    if (existing) {
      console.warn(
        `[shortcut] duplicate key "${row.key}" in Notion; keeping the first row (${existing.url}) and ignoring ${row.url}`
      )
      continue
    }
    seen.set(row.key, row)
  }
  return [...seen.values()]
}

/** Exact key wins; aliases are consulted only when no key matches. Without an
 *  explicit precedence rule, a row keyed `docs` and another row aliasing `docs`
 *  would resolve nondeterministically. */
export async function getShortcut(key: string): Promise<Shortcut | null> {
  const rows = await loadSnapshot()

  const exact = rows.find((r) => r.key === key)
  if (exact) return strip(exact)

  const aliased = rows.find((r) => r.aliases.includes(key))
  return aliased ? strip(aliased) : null
}

/** Keys to prerender.
 *
 *  A MISSING CONFIGURATION rethrows, which fails the build. That is the point:
 *  a deploy without NOTION_TOKEN would otherwise ship a site where every
 *  shortcut is broken, and finding out from a 404 is worse than finding out
 *  from a red build.
 *
 *  A Notion API failure is swallowed instead -- Notion being briefly
 *  unreachable while a build runs is not a reason to fail the deploy, and the
 *  route renders on demand anyway. */
export async function listAllKeys(): Promise<string[]> {
  try {
    const rows = await loadSnapshot()
    const keys = new Set<string>()
    for (const row of rows) {
      keys.add(row.key)
      for (const alias of row.aliases) {
        const a = normalizeKey(alias)
        if (a) keys.add(a)
      }
    }
    return [...keys]
  } catch (error) {
    if (error instanceof MissingNotionConfigError) throw error
    console.warn(
      "[shortcut] could not list keys; falling back to on-demand rendering",
      error
    )
    return []
  }
}

/** Drops `aliases`, which is a lookup detail and never reaches the UI. */
function strip(row: ShortcutRow): Shortcut {
  return {
    key: row.key,
    url: row.url,
    title: row.title,
    description: row.description,
    host: row.host,
    image: row.image,
  }
}
