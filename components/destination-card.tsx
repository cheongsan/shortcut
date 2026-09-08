import { DestinationActions } from "@/components/destination-actions"
import { DestinationThumb } from "@/components/destination-thumb"
import type { Shortcut } from "@/lib/types"

/** The confirmation card. Modelled on the blog's feed PostCard: a card
 *  containing an <article>, with a ratio-boxed thumbnail above the content. */
export function DestinationCard({ shortcut }: { shortcut: Shortcut }) {
  const { url, title, description, host, image } = shortcut

  return (
    // No press-card here: the card is not the click target, so it must not
    // shrink on hover. Column width is set by the page, so the card and the
    // theme toggle under it share one column.
    <article className="card">
      <DestinationThumb image={image} host={host} />

      <h1 className="mt-4 text-lg/7 font-medium text-pretty md:text-xl/7">
        {title}
      </h1>

      {description ? (
        <p className="mt-2 leading-8 text-fg-muted">{description}</p>
      ) : null}

      {/* The destination host, shown plainly and never in the position of
          scraped content. This card shows the destination's own thumbnail, so
          it is a more convincing phishing surface than a bare redirect would
          be; the host is the one piece of authoritative UI here. */}
      <p className="mt-2 text-sm/5 text-fg-muted">
        <span className="break-all">{host}</span>
      </p>

      <DestinationActions url={url} />
    </article>
  )
}
