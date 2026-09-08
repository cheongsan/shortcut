#!/usr/bin/env node
/**
 * Prints the data sources of NOTION_DATABASE_ID so a human can pick one once
 * and put it in NOTION_DATA_SOURCE_ID.
 *
 * Why this exists: under Notion API 2025-09-03 you query a data source, not a
 * database. Resolving it at runtime costs an extra round trip on every cold
 * path, and `data_sources[0]` is a coin flip once a database has more than one.
 *
 *   npm run notion:datasource
 */
import { readFileSync } from "node:fs"
import { Client, extractNotionId, isNotionClientError } from "@notionhq/client"

// Minimal .env.local reader -- this script runs outside Next, so nothing has
// loaded the file for us.
for (const file of [".env.local", ".env"]) {
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
      if (!m) continue
      const [, key, rawValue] = m
      if (process.env[key]) continue
      process.env[key] = rawValue.replace(/^["']|["']$/g, "")
    }
  } catch {
    // file absent; fall through to the env
  }
}

const token = process.env.NOTION_TOKEN?.trim()
const rawDatabase = process.env.NOTION_DATABASE_ID?.trim()

if (!token || !rawDatabase) {
  console.error(
    "Set NOTION_TOKEN and NOTION_DATABASE_ID (in .env.local or the environment) first."
  )
  process.exit(1)
}

const database_id = extractNotionId(rawDatabase) ?? rawDatabase
const notion = new Client({ auth: token, notionVersion: "2025-09-03" })

try {
  const database = await notion.databases.retrieve({ database_id })
  const sources = "data_sources" in database ? database.data_sources : []

  if (!sources?.length) {
    console.error(`No data sources on database ${database_id}.`)
    process.exit(1)
  }

  console.log(`\nDatabase ${database_id} has ${sources.length} data source(s):\n`)
  for (const source of sources) {
    console.log(`  name: ${source.name}`)
    console.log(`  id:   ${source.id}\n`)
  }
  console.log("Add the id you want to .env.local:\n")
  console.log(`  NOTION_DATA_SOURCE_ID=${sources[0].id}\n`)
} catch (error) {
  if (!isNotionClientError(error)) {
    console.error("\nFailed to read the database:\n", error)
    process.exit(1)
  }

  switch (error.code) {
    case "unauthorized":
      console.error(
        "\nNOTION_TOKEN is invalid.\n\n" +
          "Copy the secret from https://www.notion.so/my-integrations -- it\n" +
          "starts with `ntn_` (older integrations: `secret_`). Note this is a\n" +
          "different kind of value from the `token_v2` cookie the unofficial\n" +
          "Notion API uses.\n"
      )
      break
    case "object_not_found":
      console.error(
        `\nNotion returned object_not_found for ${database_id}.\n\n` +
          "This almost always means the database is NOT shared with the\n" +
          "integration rather than that the id is wrong. Open the database page\n" +
          "in Notion, then:  ...  ->  Connections  ->  add your integration.\n"
      )
      break
    case "validation_error":
      console.error(
        `\nNotion rejected the id ${database_id}.\n\n` +
          "Paste the database URL instead -- the id is extracted from it.\n"
      )
      break
    default:
      console.error(`\nNotion error (${error.code}): ${error.message}\n`)
  }
  process.exit(1)
}
