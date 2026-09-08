import type { Metadata, Viewport } from "next"
import { Header } from "@/components/layout/header"
import { ThemeProvider } from "@/components/layout/theme-provider"
import { SHELL_WIDTH } from "@/lib/styles"
import { CONFIG } from "@/site.config"
import { notoSansKR, redHatDisplay } from "./fonts"
import "./globals.css"

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: { default: CONFIG.title, template: `%s · ${CONFIG.title}` },
  description: CONFIG.description,
  applicationName: CONFIG.title,
  // The file lives in public/, not app/, on purpose. As an app/ metadata file
  // Next tries to decode it to fill in `sizes`, and this icon is a 256x256
  // PNG-compressed ICO its decoder chokes on ("unable to decode image data"),
  // which surfaces as a dev-overlay error on every render. From public/ it is
  // served as a plain static asset and this just emits the link.
  // The blog does the same thing: public/favicon.ico + an explicit link.
  icons: { icon: "/favicon.ico" },
  // Every page here is either the key box or a redirect interstitial. Neither
  // belongs in a search index, and indexing /{key} would publish the shortcut
  // list. app/robots.ts disallows crawling on top of this.
  robots: { index: false, follow: false, nocache: true },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "hsl(210 18% 96%)" },
    { media: "(prefers-color-scheme: dark)", color: "hsl(240 6% 10%)" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning is required: next-themes' pre-paint inline
    // script mutates class/style on <html> before React hydrates, so server and
    // client markup differ by design.
    <html
      lang={CONFIG.lang}
      suppressHydrationWarning
      className={`${redHatDisplay.variable} ${notoSansKR.variable}`}
    >
      <body className="flex min-h-svh flex-col">
        <ThemeProvider>
          <Header />
          <main className={`${SHELL_WIDTH} flex-1 px-4`}>
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  )
}
