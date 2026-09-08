import { SHELL_WIDTH } from "@/lib/styles"
import { CONFIG } from "@/site.config"

/** The blog's chrome: sticky, translucent, blurred. Width comes from
 *  SHELL_WIDTH, which is clamped to the content rather than the blog's 1120px.
 *  Lightning CSS (inside Tailwind 4) emits -webkit-backdrop-filter itself.
 *  --chrome carries its own alpha, so no /opacity modifier is needed and the
 *  result is byte-identical to the blog.
 *
 *  The logo is the only thing in here, and it leaves for the blog rather than
 *  going to "/". That is fine as a one-way exit: the key-entry form IS the
 *  not-found screen, and the confirmation card carries its own
 *  "다른 키 입력" link back to "/". */
export function Header() {
  return (
    <header className="sticky top-0 z-30 bg-chrome backdrop-blur-[20px] backdrop-saturate-[1.8]">
      <div
        className={`${SHELL_WIDTH} flex items-center px-6 py-[1.33rem] text-[1.3rem]/[1rem]`}
      >
        {/* blog Logo geometry: font-weight 900, --nav-logo, -0.75rem pull,
            0.75rem pad, scale 0.9 on hover. */}
        <a
          href={CONFIG.blogUrl}
          rel="noopener noreferrer"
          className="press-nav -ml-3 p-3 font-black text-logo hover:bg-pill-hover"
        >
          {CONFIG.title}
        </a>
      </div>
    </header>
  )
}
