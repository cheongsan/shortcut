import { ThemeToggle } from "@/components/layout/theme-toggle"

/** The theme toggle, sitting directly under the panel it belongs to.
 *
 *  It used to live in a footer pinned to the bottom of the viewport, which put
 *  it a few hundred pixels below the only thing on the page. Here it is
 *  right-aligned inside the panel's own column, so it lines up with the panel's
 *  right edge on both screens -- the 448px key form and the 672px destination
 *  card -- instead of with a wider shell. */
export function ThemeToggleRow() {
  return (
    <div className="mt-3 flex justify-end">
      <ThemeToggle />
    </div>
  )
}
