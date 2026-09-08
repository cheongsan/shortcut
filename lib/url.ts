import { BlockList, isIPv4, isIPv6 } from "node:net"

/** URL and address validation.
 *
 *  Two jobs, and the first one is the security-critical one:
 *
 *  1. Protocol allowlist. Notion's URL property does NOT validate the scheme,
 *     so `javascript:alert(1)` is a value a row can legitimately hold. It parses
 *     fine and its hostname is EMPTY, so any check that only inspects the host
 *     lets it through -- and it then lands in the confirm card's <a href>, i.e.
 *     XSS on click. We do not put a security boundary on React's dev-time
 *     warning about javascript: hrefs.
 *
 *  2. Address blocking, so a destination cannot point the server at an internal
 *     service. This is defence in depth, not a hard boundary -- see the note at
 *     the bottom.
 *
 *  Verified behaviour of Node's WHATWG URL parser, which decides what checks are
 *  actually needed:
 *
 *    http://2130706433/            -> hostname "127.0.0.1"     (decimal, normalized)
 *    http://127.1/                 -> hostname "127.0.0.1"     (short, normalized)
 *    http://0177.0.0.1/            -> hostname "127.0.0.1"     (octal, normalized)
 *    http://[::ffff:127.0.0.1]/    -> hostname "[::ffff:7f00:1]"  <- becomes HEX
 *    http://LOCALHOST./            -> hostname "localhost."       <- trailing dot survives
 *    javascript:alert(1)           -> protocol "javascript:", hostname ""
 *
 *  So decimal/octal/short IPv4 need no extra parsing (the parser already did
 *  it), but IPv4-mapped IPv6 and the trailing dot must be handled by hand. */

const blocked = new BlockList()

// IPv4
blocked.addSubnet("0.0.0.0", 8, "ipv4") // "this network"; 0.0.0.0 routes to localhost on Linux
blocked.addSubnet("10.0.0.0", 8, "ipv4") // RFC1918
blocked.addSubnet("100.64.0.0", 10, "ipv4") // CGNAT, used for internal cloud networking
blocked.addSubnet("127.0.0.0", 8, "ipv4") // loopback
blocked.addSubnet("169.254.0.0", 16, "ipv4") // link-local, incl. cloud metadata 169.254.169.254
blocked.addSubnet("172.16.0.0", 12, "ipv4") // RFC1918
blocked.addSubnet("192.0.0.0", 24, "ipv4") // IETF protocol assignments
blocked.addSubnet("192.0.2.0", 24, "ipv4") // TEST-NET-1
blocked.addSubnet("192.168.0.0", 16, "ipv4") // RFC1918
blocked.addSubnet("198.18.0.0", 15, "ipv4") // benchmarking
blocked.addSubnet("224.0.0.0", 4, "ipv4") // multicast
blocked.addSubnet("240.0.0.0", 4, "ipv4") // reserved

// IPv6
blocked.addAddress("::", "ipv6")
blocked.addAddress("::1", "ipv6") // loopback
blocked.addSubnet("fc00::", 7, "ipv6") // unique local
blocked.addSubnet("fe80::", 10, "ipv6") // link-local
blocked.addSubnet("ff00::", 8, "ipv6") // multicast
blocked.addSubnet("2001:db8::", 32, "ipv6") // documentation

/** Hostnames that are never public regardless of DNS. */
const BLOCKED_HOST_RE = /^(localhost|.*\.(localhost|local|internal|home\.arpa))$/

/** Development escape hatch.
 *
 *  Without this the OG parser is untestable locally: a fixture server lives on
 *  127.0.0.1, which our own guard blocks. Double-locked behind NODE_ENV so it
 *  cannot be switched on in production by an env var alone.
 *  (Next 16's `dangerouslyAllowLocalIP` is the same escape hatch for the same
 *  problem in the image optimizer.) */
function allowLocalTargets(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.ALLOW_LOCAL_OG_TARGETS === "1"
  )
}

/** `[::1]` -> `::1`, `EXAMPLE.COM.` -> `example.com` */
function normalizeHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "")
}

/** `::ffff:7f00:1` and `::ffff:127.0.0.1` both mean 127.0.0.1. The URL parser
 *  emits the hex form, which no IPv4 rule and no "127." string check catches. */
function mappedToIPv4(host: string): string | null {
  const dotted = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/i.exec(host)
  if (dotted?.[1] && isIPv4(dotted[1])) return dotted[1]

  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(host)
  if (hex?.[1] && hex[2]) {
    const hi = Number.parseInt(hex[1], 16)
    const lo = Number.parseInt(hex[2], 16)
    return [hi >> 8, hi & 0xff, lo >> 8, lo & 0xff].join(".")
  }
  return null
}

/** True when the host is safe to fetch: a public IP literal, or a name that is
 *  not one of the never-public suffixes.
 *
 *  Deliberately does NOT resolve DNS. See the note at the bottom of this file. */
export function isPublicHost(rawHost: string): boolean {
  const host = normalizeHost(rawHost)
  if (!host) return false
  if (BLOCKED_HOST_RE.test(host)) return false

  const mapped = mappedToIPv4(host)
  if (mapped) return !blocked.check(mapped, "ipv4")
  if (isIPv4(host)) return !blocked.check(host, "ipv4")
  if (isIPv6(host)) return !blocked.check(host, "ipv6")

  return true // a plain domain name
}

/** Parse and validate a destination URL. Returns the URL or null.
 *
 *  Call this on the Notion `URL` value AND on every redirect hop -- a
 *  `302 Location: http://169.254.169.254/` is otherwise followed happily. */
export function safeHttpUrl(raw: string | null | undefined): URL | null {
  if (!raw) return null

  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }

  // (1) the protocol allowlist -- the check a host-only guard misses entirely
  if (url.protocol !== "http:" && url.protocol !== "https:") return null

  // `http://user@evil.example@10.0.0.1/` parses differently across tools;
  // credentials in a shortcut destination are never legitimate.
  if (url.username || url.password) return null

  if (allowLocalTargets()) return url

  // (2) the address block
  return isPublicHost(url.hostname) ? url : null
}

export function isSafeHttpUrl(raw: string | null | undefined): boolean {
  return safeHttpUrl(raw) !== null
}

/** Only https is acceptable for an image the browser will load next to our
 *  own page: an http image on an https page is blocked as mixed content. */
export function safeImageUrl(raw: string | null | undefined): URL | null {
  const url = safeHttpUrl(raw)
  if (!url) return null
  if (url.protocol !== "https:") return null
  // Serving third-party SVG is an XSS vector wherever it is rendered; there is
  // no reason to accept one as a thumbnail.
  if (/\.svgz?$/i.test(url.pathname)) return null
  return url
}

/** `https://www.example.com/a/b` -> `example.com` */
export function prettyHost(raw: string): string {
  try {
    return new URL(raw).host.replace(/^www\./, "")
  } catch {
    return ""
  }
}

/* Residual risk, stated rather than papered over:
 *
 * These are hostname/literal checks, so they do not stop a PUBLIC name that
 * resolves to a private address (10.0.0.1.nip.io) or DNS rebinding, where the
 * name resolves publicly for the check and privately for the fetch.
 *
 * We stop here on purpose. Destination URLs can only be added by whoever can
 * edit the Notion database, so the realistic failure is "the owner pasted an
 * internal hostname by mistake", not an adversary. And nothing we fetch is
 * returned to the client -- we extract one image URL from the HTML and throw the
 * body away -- and the fetch happens during cache revalidation, not on a user's
 * request path. Closing the rebinding hole properly means resolving DNS
 * ourselves and pinning the connection to the checked IP via an undici agent's
 * connect.lookup, which is disproportionate here. */
