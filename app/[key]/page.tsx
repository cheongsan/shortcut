import type { Metadata } from "next"
import { notFound, permanentRedirect } from "next/navigation"
import { DestinationCard } from "@/components/destination-card"
import { CenteredScreen } from "@/components/centered-screen"
import { normalizeKey, parseKey } from "@/lib/key"
import { getShortcut, listAllKeys } from "@/lib/shortcuts"
import { CONFIG } from "@/site.config"

/** 300s, not 60s: shortcut rows change monthly, and the long window means a
 *  Notion outage stays invisible while stale data is served. */
export const revalidate = 300

/** Keys that were not prerendered still render on first hit. */
export const dynamicParams = true

/** Enables ISR for this route. Failures inside listAllKeys() are swallowed, so
 *  a Notion outage or a missing build-time env var degrades to pure on-demand
 *  rendering instead of failing the deploy. */
export async function generateStaticParams() {
  const keys = await listAllKeys()
  return keys.map((key) => ({ key }))
}

export async function generateMetadata({
  params,
}: PageProps<"/[key]">): Promise<Metadata> {
  // params is a Promise in Next 15/16 -- synchronous access was removed in 16.
  const { key: raw } = await params
  const key = parseKey(raw)
  const shortcut = key ? await getShortcut(key) : null

  return {
    title: shortcut ? `${shortcut.title} 로 이동` : CONFIG.notFoundMessage,
    // Inherited from the root layout too, but stated here because a redirect
    // interstitial must never be indexed even if the layout changes.
    robots: { index: false, follow: false, nocache: true },
  }
}

export default async function KeyPage({ params }: PageProps<"/[key]">) {
  const { key: raw } = await params

  // Canonicalize case before anything else. Routing is case-sensitive, so
  // /Docs and /docs would otherwise be two separate ISR entries for one row.
  const decoded = safeDecode(raw)
  const normalized = normalizeKey(decoded)
  if (normalized !== decoded && parseKey(normalized)) {
    permanentRedirect(`/${normalized}`)
  }

  // Shape validation happens before any I/O. Rejecting dots here is what makes
  // every crawler and scanner probe (favicon.ico, robots.txt, .env,
  // wp-login.php) cost zero lookups -- Notion's limit is ~3 req/s and one
  // scanner would otherwise exhaust it.
  const key = parseKey(decoded)
  if (!key) notFound()

  const shortcut = await getShortcut(key)
  // notFound() keeps the URL at /{key} and returns a real 404, and renders
  // app/not-found.tsx -- which is the key-entry form plus the
  // "존재하지 않는 바로가기" message. Rendering the form from here instead
  // would return 200, letting crawlers index unlimited junk URLs and making
  // link checkers report broken shortcuts as healthy.
  if (!shortcut) notFound()

  return (
    <CenteredScreen width="max-w-2xl">
      <DestinationCard shortcut={shortcut} />
    </CenteredScreen>
  )
}

function safeDecode(raw: string): string {
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}
