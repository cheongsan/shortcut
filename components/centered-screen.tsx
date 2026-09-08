import { ThemeToggleRow } from "@/components/layout/theme-toggle-row"

/** The one centring rule for every screen.
 *
 *  Both screens -- the 448px key form and the 672px destination card -- sit in
 *  the same place: horizontally and vertically centred, with the theme toggle
 *  right-aligned directly underneath. Defining it once is what keeps them from
 *  drifting apart (the card used to be top-aligned while the form was centred).
 *
 *  min-h-[60svh] uses svh, not vh, so mobile browser chrome cannot push the
 *  content below the fold.
 *
 *  `width` is passed as a literal Tailwind class at each call site so the
 *  scanner still sees it. */
export function CenteredScreen({
  width,
  children,
}: {
  width: string
  children: React.ReactNode
}) {
  return (
    <div className="grid min-h-[60svh] place-items-center py-10">
      <div className={`w-full ${width}`}>
        {children}
        <ThemeToggleRow />
      </div>
    </div>
  )
}
