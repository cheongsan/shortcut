"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"

/** attribute="class" must match the `@custom-variant dark` selector in
 *  globals.css. disableTransitionOnChange stops every transition-[scale] and
 *  colour transition on the page from firing at once when the theme flips. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
