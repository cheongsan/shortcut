"use client"

import { ArrowUpRight } from "lucide-react"
import Link from "next/link"
import { useNavLoading } from "@/components/layout/nav-loading"
import { QuietLinkClasses } from "@/components/ui"

/** The card's two links, as a client component so each can start the logo's
 *  loading shimmer. Both leave this page, so the flag is never cleared -- the
 *  state dies with the document. */
export function DestinationActions({ url }: { url: string }) {
  const { setLoading } = useNavLoading()

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      {/* A real <a href>, so it works with no JavaScript and the user can see
          where it goes before clicking. Same tab: a shortcut going somewhere
          else is what the user expects. nofollow because this site now points
          at arbitrary domains. */}
      <a
        href={url}
        rel="noopener noreferrer nofollow"
        onClick={() => setLoading(true)}
        className="press-pill inline-flex items-center justify-center gap-1.5 bg-fg px-4 py-2 text-[0.95rem] font-medium text-page"
      >
        이동하기
        <ArrowUpRight aria-hidden className="size-4" />
      </a>

      <Link
        href="/"
        onClick={() => setLoading(true)}
        className={QuietLinkClasses()}
      >
        다른 키 입력
      </Link>
    </div>
  )
}
