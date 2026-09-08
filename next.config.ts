import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // Pin the workspace root. Without this, Turbopack walks up and finds a stray
  // /Users/ryan/package-lock.json outside the repo and warns about ignoring it.
  turbopack: { root: import.meta.dirname },

  // cacheComponents stays OFF, deliberately.
  // Turning it on would (a) make `export const revalidate` an error, (b) require
  // generateStaticParams to return >= 1 param, which makes `next build` depend on
  // Notion credentials + network, and (c) switch us to `use cache`, whose default
  // handler is in-memory and does NOT persist across serverless instances --
  // meaning nearly every /{key} render would hit the Notion API.
  // unstable_cache + route-segment revalidate is the only combination that gives
  // cross-instance, cross-deploy caching on Vercel.

  // No `images` config: we never run a destination thumbnail through the Next
  // image optimizer, so there is nothing to allowlist. Opening remotePatterns to
  // `hostname: "**"` (which arbitrary OG hosts would require) would turn
  // /_next/image into an open proxy.

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          // Without this, the destination's access log records
          // https://<our-domain>/{key} -- leaking the shortcut key to a third party.
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ]
  },
}

export default nextConfig
