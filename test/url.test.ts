import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  isPublicHost,
  isSafeHttpUrl,
  prettyHost,
  safeImageUrl,
} from "../lib/url.ts"

describe("protocol allowlist", () => {
  it("rejects schemes that parse but have no hostname", () => {
    // These are the ones a host-only guard lets through, and Notion's URL
    // property does not validate the scheme, so a row can really hold them.
    for (const raw of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
      "ftp://example.com/x",
      "gopher://example.com/",
      "mailto:a@example.com",
      "about:blank",
      "blob:https://example.com/uuid",
    ]) {
      assert.equal(isSafeHttpUrl(raw), false, raw)
    }
  })

  it("accepts http and https", () => {
    assert.equal(isSafeHttpUrl("http://example.com"), true)
    assert.equal(isSafeHttpUrl("https://example.com/a?b=c#d"), true)
  })

  it("rejects embedded credentials", () => {
    assert.equal(isSafeHttpUrl("http://user:pw@example.com/"), false)
    assert.equal(isSafeHttpUrl("http://user@evil.example@10.0.0.1/"), false)
  })

  it("rejects unparseable and empty input", () => {
    for (const raw of ["", "   ", "not a url", "://x", null, undefined]) {
      assert.equal(isSafeHttpUrl(raw as string), false, String(raw))
    }
  })
})

describe("private address blocking", () => {
  it("blocks loopback in every spelling the URL parser normalizes", () => {
    // The parser rewrites all of these to 127.0.0.1, which is exactly why no
    // decimal/octal parsing of our own is needed.
    for (const raw of [
      "http://127.0.0.1/",
      "http://127.1/",
      "http://2130706433/",
      "http://0177.0.0.1/",
      "http://localhost/",
      "http://LOCALHOST./",
      "http://anything.localhost/",
    ]) {
      assert.equal(isSafeHttpUrl(raw), false, raw)
    }
  })

  it("blocks IPv4-mapped IPv6, which the parser turns into hex", () => {
    // new URL("http://[::ffff:127.0.0.1]/").hostname === "[::ffff:7f00:1]"
    assert.equal(isSafeHttpUrl("http://[::ffff:127.0.0.1]/"), false)
    assert.equal(isSafeHttpUrl("http://[::ffff:7f00:1]/"), false)
    assert.equal(isPublicHost("::ffff:7f00:1"), false)
    assert.equal(isPublicHost("::ffff:0a00:1"), false) // 10.0.0.1
    assert.equal(isPublicHost("::ffff:a9fe:a9fe"), false) // 169.254.169.254
    // and a mapped PUBLIC address is still fine
    assert.equal(isPublicHost("::ffff:0808:0808"), true) // 8.8.8.8
  })

  it("blocks every reserved range we care about", () => {
    const blocked = [
      "0.0.0.0",
      "10.0.0.5",
      "100.64.1.1", // CGNAT
      "127.0.0.1",
      "169.254.169.254", // cloud metadata
      "172.16.0.1",
      "172.31.255.255",
      "192.0.0.1",
      "192.0.2.1",
      "192.168.1.1",
      "198.18.0.1",
      "224.0.0.1",
      "240.0.0.1",
      "::",
      "::1",
      "fe80::1",
      "fc00::1",
      "fd00::1",
      "ff02::1",
      "2001:db8::1",
    ]
    for (const host of blocked) {
      assert.equal(isPublicHost(host), false, host)
    }
  })

  it("allows public addresses and names", () => {
    const allowed = [
      "8.8.8.8",
      "1.1.1.1",
      "172.15.0.1", // just below the RFC1918 block
      "172.32.0.1", // just above it
      "100.63.255.255", // just below CGNAT
      "100.128.0.1", // just above CGNAT
      "2606:4700::1111",
      "example.com",
      "cheongsan.com",
      "xn--e1afmkfd.xn--p1ai",
    ]
    for (const host of allowed) {
      assert.equal(isPublicHost(host), true, host)
    }
  })
})

describe("safeImageUrl", () => {
  it("requires https, to avoid mixed content on our own page", () => {
    assert.equal(safeImageUrl("http://example.com/a.png"), null)
    assert.ok(safeImageUrl("https://example.com/a.png"))
  })

  it("rejects svg, which would be script execution if ever same-origin", () => {
    assert.equal(safeImageUrl("https://example.com/a.svg"), null)
    assert.equal(safeImageUrl("https://example.com/a.SVGZ"), null)
  })

  it("inherits the private-address block", () => {
    assert.equal(safeImageUrl("https://127.0.0.1/a.png"), null)
    assert.equal(safeImageUrl("https://169.254.169.254/a.png"), null)
  })
})

describe("prettyHost", () => {
  it("strips a www prefix and keeps the port", () => {
    assert.equal(prettyHost("https://www.example.com/a/b"), "example.com")
    assert.equal(prettyHost("https://example.com:8443/"), "example.com:8443")
    assert.equal(prettyHost("https://sub.example.com/"), "sub.example.com")
  })

  it("returns an empty string rather than throwing", () => {
    assert.equal(prettyHost("nope"), "")
  })
})
