import "server-only"
import {
  APIErrorCode,
  Client,
  collectAllDataSourceRows,
  extractNotionId,
  isFullPage,
  isNotionClientError,
} from "@notionhq/client"
import type { PageObjectResponse } from "@notionhq/client"
import { normalizeKey } from "./key"
import {
  ENABLED_VALUE,
  isEnabled,
  multiSelectValues,
  plainText,
  urlValue,
} from "./notion-props"
import { resolveOgImage } from "./og"
import type { ShortcutRow } from "./types"
import { prettyHost, safeHttpUrl } from "./url"

/** Pinned explicitly. The SDK's default happens to be 2025-09-03 today, but a
 *  patch bump must not be able to change the wire API underneath us. */
const NOTION_VERSION = "2025-09-03"

function env(name: string): string | undefined {
  const value = process.env[name]
  return value && value.trim() ? value.trim() : undefined
}

/** Thrown when the Notion environment is not configured.
 *
 *  Distinct from an API failure on purpose: a missing variable is a
 *  misconfiguration that must surface immediately, while Notion being briefly
 *  unreachable should not take a deploy down. Callers branch on this. */
export class MissingNotionConfigError extends Error {
  constructor(missing: string[]) {
    super(
      `Notion is not configured: ${missing.join(", ")} 가 필요합니다. ` +
        `README의 "2. Notion 연결하기" 와 "3. 환경변수" 를 확인해 주세요.`
    )
    this.name = "MissingNotionConfigError"
  }
}

/** Returns the token, or throws with the exact list of what is missing.
 *
 *  There is no fallback to sample data. Serving fake shortcuts would hide a
 *  broken deploy behind a site that looks like it works. */
function requireConfig(): string {
  const missing: string[] = []
  const token = env("NOTION_TOKEN")
  if (!token) missing.push("NOTION_TOKEN")
  if (!env("NOTION_DATA_SOURCE_ID") && !env("NOTION_DATABASE_ID")) {
    missing.push("NOTION_DATABASE_ID (또는 NOTION_DATA_SOURCE_ID)")
  }
  if (missing.length > 0 || !token) throw new MissingNotionConfigError(missing)
  return token
}

let client: Client | undefined
function getClient(): Client {
  // Created lazily, inside a function rather than at module scope, so importing
  // this module never throws -- the failure surfaces where a lookup is actually
  // attempted, with a message naming the missing variable.
  client ??= new Client({
    auth: requireConfig(),
    notionVersion: NOTION_VERSION,
    timeoutMs: 8_000,
  })
  return client
}

/** Under API 2025-09-03 you query a DATA SOURCE, not a database.
 *
 *  Prefer the explicit id: resolving it from the database costs an extra
 *  round trip on every cold path, and `data_sources[0]` is a coin flip once a
 *  database has more than one. `npm run notion:datasource` prints them so a
 *  human picks once. */
let dataSourceId: string | undefined
async function getDataSourceId(): Promise<string> {
  if (dataSourceId) return dataSourceId

  const explicit = env("NOTION_DATA_SOURCE_ID")
  if (explicit) {
    dataSourceId = extractNotionId(explicit) ?? explicit
    return dataSourceId
  }

  const raw = env("NOTION_DATABASE_ID")
  if (!raw) throw new Error("Set NOTION_DATA_SOURCE_ID or NOTION_DATABASE_ID")

  const database_id = extractNotionId(raw) ?? raw
  const database = await getClient().databases.retrieve({ database_id })
  const sources = "data_sources" in database ? database.data_sources : undefined
  const first = sources?.[0]?.id
  if (!first) {
    throw new Error(
      `Notion database ${database_id} exposes no data sources. Run \`npm run notion:datasource\`.`
    )
  }
  if (sources && sources.length > 1) {
    console.warn(
      `[shortcut] database has ${sources.length} data sources; using "${sources[0]?.name}". Set NOTION_DATA_SOURCE_ID to choose explicitly.`
    )
  }
  dataSourceId = first
  return first
}

/* ------------------------------------------------------------------------- */

/** Loads the whole enabled table in one paginated pass.
 *
 *  collectAllDataSourceRows handles the cursor. Doing it by hand and forgetting
 *  `has_more` is the classic version of this bug: dataSources.query returns at
 *  most 100 rows per page, so shortcut #101 would simply stop working, months
 *  after anyone last looked at this file.
 *
 *  Only `Enabled` is filtered server-side -- `select` is a documented filterable
 *  type, and `equals` excludes both `Disabled` and rows with nothing chosen, so
 *  the fail-closed behaviour is inherent in the query. Key matching is done in
 *  our own code
 *  (see lib/key.ts) because Notion's docs do not agree on whether a `title`
 *  filter is even available under 2025-09-03, and text `equals` case sensitivity
 *  is undocumented -- neither is something to hang routing on. */
export async function loadRowsFromNotion(): Promise<ShortcutRow[]> {
  const pages = await withRetry(async () =>
    collectAllDataSourceRows(getClient(), {
      data_source_id: await getDataSourceId(),
      filter: { property: "Enabled", select: { equals: ENABLED_VALUE } },
    })
  )

  const rows: ShortcutRow[] = []

  // OG lookups run here, during cache revalidation, and in parallel across
  // rows. On a user's request path this would be a fan-out against the
  // destination sites.
  const resolved = await Promise.all(
    pages.filter(isFullPage).map(async (page) => {
      const row = toRow(page)
      if (!row) return null
      return { ...row, image: await resolveOgImage(row.url) }
    })
  )

  for (const row of resolved) if (row) rows.push(row)
  return rows
}

function toRow(page: PageObjectResponse): ShortcutRow | null {
  // Defence in depth. The query filter already excludes these, but keeping the
  // invariant here means loosening or removing that filter later cannot
  // silently start publishing disabled shortcuts.
  if (!isEnabled(page.properties.Enabled)) return null

  const key = normalizeKey(plainText(page.properties.Key))
  if (!key) return null // blank Title

  // Validated at the data layer, not in the component: an invalid or dangerous
  // scheme must never reach the DOM, not even as an href string. A row with a
  // bad URL is treated as if it did not exist.
  const url = safeHttpUrl(urlValue(page.properties.URL))
  if (!url) {
    console.warn(
      `[shortcut] key "${key}" has an unusable URL and will be ignored`
    )
    return null
  }

  const host = prettyHost(url.toString())

  return {
    key,
    url: url.toString(),
    // Falls back to the host, NOT to a scraped og:title -- see lib/og.ts.
    title: plainText(page.properties.Title) || host,
    description: plainText(page.properties.Description),
    host,
    image: null, // filled in by loadRowsFromNotion
    aliases: multiSelectValues(page.properties.Aliases)
      .map(normalizeKey)
      .filter(Boolean),
  }
}

/** Notion really does return 502/529 under load, and 429 when the ~3 req/s
 *  average is exceeded. One retry, honouring Retry-After, with jitter. */
async function withRetry<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    // Not a Notion failure and not retryable: the message already says exactly
    // which variable is missing, so logging it as an "unexpected Notion
    // failure" would only misdirect whoever reads the build output.
    if (error instanceof MissingNotionConfigError) throw error

    const retryAfter = retryDelayMs(error)
    if (retryAfter === null) {
      logNotionError(error)
      throw error
    }
    await new Promise((resolve) => setTimeout(resolve, retryAfter))
    try {
      return await operation()
    } catch (retryError) {
      logNotionError(retryError)
      throw retryError
    }
  }
}

function retryDelayMs(error: unknown): number | null {
  if (!isNotionClientError(error)) return null
  const retryable =
    error.code === APIErrorCode.RateLimited ||
    error.code === APIErrorCode.ServiceOverload ||
    error.code === APIErrorCode.ServiceUnavailable ||
    error.code === APIErrorCode.InternalServerError ||
    error.code === APIErrorCode.GatewayTimeout
  if (!retryable) return null

  const header =
    "headers" in error && error.headers instanceof Headers
      ? error.headers.get("retry-after")
      : null
  const seconds = header ? Number(header) : Number.NaN
  const base = Number.isFinite(seconds) ? seconds * 1000 : 1000
  return Math.min(base, 5000) + Math.floor(Math.random() * 250)
}

/** Says which failure it was, in the server log. The distinction matters
 *  because Notion reports two very different problems in confusable ways. */
function logNotionError(error: unknown): void {
  if (!isNotionClientError(error)) {
    console.error("[shortcut] unexpected Notion failure", error)
    return
  }
  switch (error.code) {
    case APIErrorCode.Unauthorized:
      console.error("[shortcut] NOTION_TOKEN is invalid or missing.")
      break
    case APIErrorCode.ObjectNotFound:
      // The most common first-run failure by a wide margin, and it reads like
      // the opposite of what it is.
      console.error(
        "[shortcut] Notion returned object_not_found. This almost always means the database is NOT shared with the integration, not that the id is wrong: open the database page -> ... -> Connections -> add your integration."
      )
      break
    case APIErrorCode.ValidationError:
      // A misspelled column name surfaces here rather than as an empty result.
      console.error(
        "[shortcut] Notion rejected the query. Check the column names and types: Key (Title), URL (URL), Title (Rich text), Description (Rich text), Enabled (Select), Aliases (Multi-select).",
        error.message
      )
      break
    case APIErrorCode.RateLimited:
      console.error("[shortcut] Notion rate limited (~3 req/s average).")
      break
    default:
      console.error(`[shortcut] Notion error ${error.code}:`, error.message)
  }
}
