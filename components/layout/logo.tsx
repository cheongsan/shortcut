"use client"

import { useNavLoading } from "@/components/layout/nav-loading"
import { CONFIG } from "@/site.config"

/** blog Logo geometry: font-weight 900, --nav-logo, -0.75rem pull, 0.75rem pad,
 *  scale 0.9 on hover -- plus the blog's sky-blue shimmer while a load is in
 *  flight, driven by data-loading exactly as the live site does it.
 *
 *  The hover background is gated on data-loading="false": it sets
 *  background-color, which would otherwise paint over the gradient that the
 *  shimmer puts on `background`. Gating it in the variant means the conflicting
 *  declaration is never emitted, rather than relying on layer or source order
 *  to resolve it. */
export function Logo() {
  const { loading } = useNavLoading()

  return (
    <a
      href={CONFIG.blogUrl}
      rel="noopener noreferrer"
      data-loading={loading}
      className="press-nav logo-shimmer -ml-3 p-3 font-black text-logo data-[loading=false]:hover:bg-pill-hover"
    >
      {CONFIG.title}
    </a>
  )
}
