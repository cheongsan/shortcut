"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

/** Two-state, in the footer. The blog used a three-item dropdown
 *  (Light/Dark/System), which drags in @radix-ui/react-dropdown-menu plus
 *  enter/exit animation classes to host one control on a two-screen app, and
 *  costs an extra interaction. defaultTheme="system" means the first visit and
 *  every visit before the first toggle still follow the OS.
 *
 *  No `mounted` guard, deliberately: both icons are always in the DOM and the
 *  crossfade is pure CSS driven by the `dark:` variant, so server and client
 *  markup are byte-identical -- no hydration mismatch and no first-paint icon
 *  flash. resolvedTheme is only read inside the click handler, which runs after
 *  mount, so its initial undefined never matters. This is exactly why shadcn's
 *  stock toggle renders two icons instead of branching on the theme. */
export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="press-nav relative inline-flex size-10 shrink-0 items-center justify-center bg-pill text-fg-muted hover:bg-pill-hover"
    >
      {/* lucide-react does not add aria-hidden itself. */}
      <Sun
        aria-hidden
        className="size-5 rotate-0 scale-100 transition-transform duration-300 dark:-rotate-90 dark:scale-0"
      />
      <Moon
        aria-hidden
        className="absolute size-5 rotate-90 scale-0 transition-transform duration-300 dark:rotate-0 dark:scale-100"
      />
      <span className="sr-only">테마 전환</span>
    </button>
  )
}
