"use client"

import { ImageOff } from "lucide-react"
import { useState } from "react"

/** The thumbnail box.
 *
 *  A client component purely so a broken image can fall back. resolveOgImage()
 *  already HEAD-checks the URL when the snapshot is built, but that is a
 *  point-in-time check: the image can 404, 403 or get rate-limited by the time
 *  a visitor loads the page. Observed for real -- GitHub's
 *  opengraph.githubassets.com serves a 200 PNG one minute and a 429 the next.
 *  Without this, a failed <img> leaves the loading-grey box on screen forever
 *  with nothing to tell the user why. The blog handles broken images the same
 *  way, with an onerror probe in Gravatar.tsx.
 *
 *  The ratio box is rendered by the parent either way, so the fallback swap
 *  cannot shift layout. */
export function DestinationThumb({
  image,
  host,
}: {
  image: string | null
  host: string
}) {
  const [failed, setFailed] = useState(false)
  const showImage = image !== null && !failed

  return (
    // aspect-[1200/630] is the OG standard, so object-cover crops nothing (the
    // blog's padding-bottom: 66% would clip a 1.91:1 image). Reserving the
    // ratio before load is what keeps CLS at 0.
    <div className="relative aspect-[1200/630] w-full overflow-hidden rounded-xl bg-placeholder">
      {showImage ? (
        // A plain <img>, not next/image: arbitrary OG hosts would need
        // remotePatterns [{ hostname: "**" }], which makes /_next/image an open
        // proxy, and the optimizer's cache (4h+ by default in Next 16) cannot be
        // invalidated. We render at exactly one size, so there is nothing to
        // gain. referrerPolicy keeps the shortcut key out of the image host's
        // logs.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        // Not a theoretical branch: cheongsan.com serves no og:image at all,
        // and the real-world hit rate is roughly 50-70%.
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-placeholder-strong">
          <ImageOff aria-hidden className="size-7 text-fg-subtle" />
          <span className="text-sm/5 text-fg-muted">{host}</span>
        </div>
      )}
    </div>
  )
}
