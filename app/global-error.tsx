"use client"

import { CONFIG } from "@/site.config"
import "./globals.css"

/** Replaces the root layout entirely, so it must render its own <html>/<body>
 *  and cannot use the theme provider or the font variables. Kept deliberately
 *  plain and readable in both colour schemes. */
export default function GlobalError() {
  return (
    <html lang={CONFIG.lang}>
      <body className="grid min-h-svh place-items-center bg-page p-6 text-center">
        <div>
          <h1 className="text-3xl/9 text-fg">일시적인 오류입니다</h1>
          <p className="mt-4 text-sm/5 text-fg-muted">
            잠시 후 다시 시도해 주세요.
          </p>
          {/* Intentionally a plain <a>, not <Link>: an error boundary needs a
              hard document load to escape a broken client state, which a soft
              client-side navigation would not do. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="mt-8 inline-block text-sm/5 underline">
            처음으로
          </a>
        </div>
      </body>
    </html>
  )
}
