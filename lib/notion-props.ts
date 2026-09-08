import type { PageObjectResponse } from "@notionhq/client"

/** Pure readers over Notion property shapes.
 *
 *  Kept out of lib/notion.ts on purpose: that module imports `server-only`,
 *  which throws outside a React Server context, so anything living there cannot
 *  be unit tested. These functions have no server dependency, so they can.
 *
 *  All of them read defensively. Notion property shapes are wide unions, and a
 *  column that gets renamed or retyped must degrade to an empty value rather
 *  than throw -- one malformed row must not take down every shortcut. */

export type Props = PageObjectResponse["properties"]
export type Prop = Props[string] | undefined

/** The exact `Enabled` select option that permits a redirect.
 *
 *  Must match the Notion option name character for character; there is no
 *  normalization on Notion's side. */
export const ENABLED_VALUE = "Enabled"

export function plainText(prop: Prop): string {
  if (!prop) return ""
  const items =
    prop.type === "title"
      ? prop.title
      : prop.type === "rich_text"
        ? prop.rich_text
        : undefined
  // NOTE: title[0] is undefined for a blank Notion Title, so this must not
  // index into it -- that is a TypeError, not an empty string.
  return (items ?? []).map((item) => item.plain_text).join("").trim()
}

export function urlValue(prop: Prop): string {
  if (!prop) return ""
  if (prop.type === "url") return prop.url?.trim() ?? ""
  return plainText(prop) // tolerate the column being rich_text
}

export function multiSelectValues(prop: Prop): string[] {
  return prop?.type === "multi_select"
    ? prop.multi_select.map((option) => option.name)
    : []
}

/** Reads a `select`, returning "" when nothing is chosen.
 *
 *  A select has a state a checkbox does not: EMPTY. An unset select must read
 *  as "not enabled" so that adding a row without picking a value cannot publish
 *  a redirect by accident -- the same fail-closed direction a checkbox gave for
 *  free by defaulting to false. */
export function selectValue(prop: Prop): string {
  return prop?.type === "select" ? (prop.select?.name ?? "") : ""
}

/** Whether a row's `Enabled` select permits a redirect.
 *
 *  The server-side filter already excludes anything but ENABLED_VALUE, so this
 *  is defence in depth: it keeps the invariant next to the code that builds the
 *  row, so removing or loosening the query filter later cannot silently publish
 *  disabled shortcuts. */
export function isEnabled(prop: Prop): boolean {
  return selectValue(prop) === ENABLED_VALUE
}
