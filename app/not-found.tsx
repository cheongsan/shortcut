"use client"

import { usePathname } from "next/navigation"
import { KeyScreen } from "@/components/key-screen"
import { CONFIG } from "@/site.config"

/** Reached via notFound() from /[key], which keeps the URL at /{key} and
 *  returns a real 404. Rendering the form from the page instead would have
 *  returned 200, letting crawlers index unlimited junk URLs and making link
 *  checkers report broken shortcuts as healthy.
 *
 *  This is NOT a separate 404 layout: it is the key screen with a message in
 *  the form's hint line, so the user is left on the one control that can fix
 *  the problem. No similar-key suggestions, by decision.
 *
 *  not-found.tsx receives no props, so the attempted key is recovered from the
 *  pathname and prefilled. That needs no Suspense boundary because
 *  cacheComponents is off. */
export default function NotFound() {
  // Called at the top level -- hooks may not be called conditionally or inside
  // a nested function.
  const pathname = usePathname()

  return (
    <KeyScreen
      defaultValue={safeDecode(pathname.replace(/^\//, ""))}
      message={CONFIG.notFoundMessage}
    />
  )
}

function safeDecode(raw: string): string {
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}
