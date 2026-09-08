import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { isValidKey, normalizeKey, parseKey } from "../lib/key.ts"

describe("normalizeKey", () => {
  it("trims, lowercases and NFC-normalizes", () => {
    assert.equal(normalizeKey("  Docs  "), "docs")
    assert.equal(normalizeKey("BLOG"), "blog")
  })

  it("normalizes NFD Korean to NFC", () => {
    // Text pasted from some macOS sources is NFD, so a byte comparison against
    // Notion's NFC title fails with no visible cause.
    const nfd = "한글".normalize("NFD")
    assert.notEqual(nfd, "한글") // precondition: the two really do differ
    assert.equal(normalizeKey(nfd), "한글")
  })
})

describe("isValidKey", () => {
  it("rejects anything containing a dot, which is the whole point", () => {
    // Every crawler and scanner probe fails here and costs zero I/O.
    for (const k of [
      "favicon.ico",
      "robots.txt",
      "sitemap.xml",
      "sw.js",
      "apple-touch-icon.png",
      ".env",
      "wp-login.php",
      "index.php",
      "a.b",
    ]) {
      assert.equal(isValidKey(k), false, k)
    }
  })

  it("rejects reserved single-segment names", () => {
    for (const k of ["api", "_next", "icon", "opengraph-image", "static"]) {
      assert.equal(isValidKey(k), false, k)
    }
  })

  it("rejects the wrong shape", () => {
    for (const k of [
      "",
      "-lead",
      "_lead",
      "has space",
      "has/slash",
      "한글",
      "UPPER", // isValidKey runs AFTER normalizeKey, so this is out of contract
      "a".repeat(65),
    ]) {
      assert.equal(isValidKey(k), false, k)
    }
  })

  it("accepts the intended shape up to the length boundary", () => {
    for (const k of ["a", "0", "blog", "my-key", "my_key", "a1_b-2", "a".repeat(64)]) {
      assert.equal(isValidKey(k), true, k)
    }
  })
})

describe("parseKey", () => {
  it("normalizes before validating", () => {
    assert.equal(parseKey("Docs"), "docs")
    assert.equal(parseKey("  BLOG "), "blog")
  })

  it("decodes percent-encoding from the route param", () => {
    assert.equal(parseKey("my%2Dkey"), "my-key")
  })

  it("survives a malformed escape instead of throwing", () => {
    assert.equal(parseKey("%E0%A4%A"), null)
  })

  it("returns null for unusable input", () => {
    for (const k of ["", "favicon.ico", "api", null, undefined]) {
      assert.equal(parseKey(k), null, String(k))
    }
  })
})
