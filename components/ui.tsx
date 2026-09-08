import { cn } from "@/lib/utils"

/** Two primitives, hand-rolled.
 *
 *  `shadcn add button input` was tried first and rejected: it emitted code
 *  importing `class-variance-authority` without installing it (so the build
 *  failed), ignored the configured `@/lib/utils` alias in favour of a
 *  third-party `cn` package, and pulled in the `radix-ui` umbrella -- ~1.4MB of
 *  dependencies for two elements where this app needs exactly one button style
 *  and one input style. The generated variant tables were also written against
 *  shadcn's own token names; ours are mapped to them in globals.css, so a later
 *  `shadcn add` still resolves correctly if a real primitive is ever needed. */

/** The blog's CardLinkALT geometry -- inline-flex, .5rem 1rem, 0.75rem radius,
 *  0.95rem/500, scale-.97 on hover -- but high contrast.
 *
 *  The blog's own pill colour is unusable here: its dark --card-link-alt is
 *  hsl(240 6% 12%), byte-identical to the dark card it would sit on. On this
 *  page pressing the button IS the page, so the CTA uses body ink on the page
 *  ground: ~17:1 light, ~15:1 dark. */
const actionClasses =
  "press-pill inline-flex items-center justify-center gap-1.5 bg-fg px-4 py-2 text-[0.95rem] font-medium text-page disabled:pointer-events-none disabled:opacity-60"

/** Quieter sibling, on the blog's --card-link pair. */
const quietClasses =
  "press-pill inline-flex items-center justify-center gap-1.5 bg-pill px-3 py-2 text-[0.95rem] font-medium text-fg-muted hover:bg-pill-hover"

export function ActionButton({
  className,
  ...props
}: React.ComponentProps<"button">) {
  return <button className={cn(actionClasses, className)} {...props} />
}

export function ActionLink({
  className,
  ...props
}: React.ComponentProps<"a">) {
  return <a className={cn(actionClasses, className)} {...props} />
}

export function QuietLinkClasses(className?: string) {
  return cn(quietClasses, className)
}

/** Pill input on the page ground.
 *
 *  bg-page rather than bg-panel is the one pair that reads in BOTH themes when
 *  nested inside a card: light is 96% inside white, dark is 10% inside 12%.
 *
 *  text-base (16px) is load-bearing on iOS -- anything smaller triggers
 *  Safari's zoom-on-focus. No outline-none anywhere, so the single global
 *  :focus-visible rule in globals.css is the focus ring. */
export function KeyInput({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "min-w-0 flex-1 rounded-xl border border-line bg-page px-4 py-2 text-base text-fg placeholder:text-fg-subtle aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}
