import { ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { DestinationThumb } from "@/components/destination-thumb"
import { QuietLinkClasses } from "@/components/ui"
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

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {/* A real <a href>, so it works with no JavaScript and the user can see
            where it goes before clicking. Same tab: a shortcut going somewhere
            else is what the user expects. nofollow because this site now points
            at arbitrary domains. */}
        <a
          href={url}
          rel="noopener noreferrer nofollow"
          className="press-pill inline-flex items-center justify-center gap-1.5 bg-fg px-4 py-2 text-[0.95rem] font-medium text-page"
        >
          이동하기
          <ArrowUpRight aria-hidden className="size-4" />
        </a>

        <Link href="/" className={QuietLinkClasses()}>
          다른 키 입력
        </Link>
      </div>
    </article>
  )
}
