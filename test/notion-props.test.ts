import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  ENABLED_VALUE,
  isEnabled,
  multiSelectValues,
  plainText,
  selectValue,
  urlValue,
  type Prop,
} from "../lib/notion-props.ts"

/** Notion property shapes are wide unions and only a few fields matter here, so
 *  fixtures are built structurally and narrowed at the boundary. */
const prop = (value: unknown): Prop => value as Prop

const richText = (...texts: string[]) =>
  prop({ type: "rich_text", rich_text: texts.map((t) => ({ plain_text: t })) })

const title = (...texts: string[]) =>
  prop({ type: "title", title: texts.map((t) => ({ plain_text: t })) })

const select = (name: string | null) =>
  prop({ type: "select", select: name === null ? null : { name } })

describe("plainText", () => {
  it("joins rich text and title runs", () => {
    // Notion splits styled text into multiple runs, so a single visible string
    // can arrive as several plain_text pieces.
    assert.equal(plainText(richText("my", "-", "key")), "my-key")
    assert.equal(plainText(title("CHEONGSANDO")), "CHEONGSANDO")
  })

  it("trims, so a stray trailing space in Notion does not break matching", () => {
    assert.equal(plainText(title("  docs  ")), "docs")
  })

  it("returns an empty string for a blank Title instead of throwing", () => {
    // title[0] is undefined here; indexing into it would be a TypeError.
    assert.equal(plainText(title()), "")
    assert.equal(plainText(prop({ type: "title", title: [] })), "")
  })

  it("returns an empty string for a missing or wrongly typed column", () => {
    assert.equal(plainText(undefined), "")
    assert.equal(plainText(prop({ type: "number", number: 5 })), "")
  })
})

describe("urlValue", () => {
  it("reads a url property and trims it", () => {
    assert.equal(urlValue(prop({ type: "url", url: " https://x.test " })), "https://x.test")
  })

  it("tolerates the column being rich_text instead of url", () => {
    assert.equal(urlValue(richText("https://x.test")), "https://x.test")
  })

  it("handles an empty url property", () => {
    assert.equal(urlValue(prop({ type: "url", url: null })), "")
    assert.equal(urlValue(undefined), "")
  })
})

describe("multiSelectValues", () => {
  it("returns option names", () => {
    assert.deepEqual(
      multiSelectValues(
        prop({ type: "multi_select", multi_select: [{ name: "a" }, { name: "b" }] })
      ),
      ["a", "b"]
    )
  })

  it("returns an empty array for a missing or wrongly typed column", () => {
    assert.deepEqual(multiSelectValues(undefined), [])
    assert.deepEqual(multiSelectValues(select("Enabled")), [])
  })
})

describe("selectValue", () => {
  it("reads the chosen option name", () => {
    assert.equal(selectValue(select("Enabled")), "Enabled")
    assert.equal(selectValue(select("Disabled")), "Disabled")
  })

  it("returns an empty string when nothing is chosen", () => {
    // This is the state a checkbox never had, and the reason isEnabled must
    // fail closed rather than treat "not Disabled" as enabled.
    assert.equal(selectValue(select(null)), "")
  })

  it("returns an empty string for a missing or wrongly typed column", () => {
    assert.equal(selectValue(undefined), "")
    assert.equal(selectValue(prop({ type: "checkbox", checkbox: true })), "")
  })
})

describe("isEnabled", () => {
  it("permits only the exact Enabled option", () => {
    assert.equal(isEnabled(select(ENABLED_VALUE)), true)
  })

  it("fails closed for every other state", () => {
    for (const value of [
      select("Disabled"),
      select(null), // nothing chosen
      select("enabled"), // Notion does not normalize case
      select("Enabled "), // nor whitespace
      select("활성"),
      undefined, // column missing or renamed
      prop({ type: "checkbox", checkbox: true }), // column still a checkbox
    ]) {
      assert.equal(isEnabled(value), false, JSON.stringify(value))
    }
  })
})
