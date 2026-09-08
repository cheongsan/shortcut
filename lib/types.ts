export type Shortcut = {
  /** Normalized key (lowercase, NFC, trimmed). */
  key: string
  /** Validated http/https destination. */
  url: string
  /** Notion `Title`, falling back to the host. Never scraped -- see lib/og.ts. */
  title: string
  /** Notion `Description`. May be empty. */
  description: string
  /** Display host, e.g. "github.com". */
  host: string
  /** Validated https OG image URL, or null when there is none or it failed. */
  image: string | null
}

/** A snapshot row. `aliases` never reaches the UI. */
export type ShortcutRow = Shortcut & { aliases: string[] }
