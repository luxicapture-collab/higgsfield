/**
 * Call any Higgsfield model endpoint through the official SDK.
 *
 *   pnpm hf <model-path> '<json input>' [--no-wait]
 *   pnpm hf bytedance/seedance-2.0/text-to-video '{"prompt":"…","duration":5}'
 *
 * Model paths and input schemas come from each model's API page
 * (open.higgsfield.ai/explore). Credentials: HF_CREDENTIALS="KEY_ID:KEY_SECRET",
 * or HF_API_KEY_ID + HF_API_KEY_SECRET, from the shell or .env.local.
 * Submits are never retried, so an ambiguous failure cannot double-charge.
 */
import { existsSync } from "node:fs"

import { createHiggsfieldClient } from "@higgsfield/client/v2"

if (existsSync(".env.local")) process.loadEnvFile(".env.local")

const args = process.argv.slice(2)
const wait = !args.includes("--no-wait")
const [model, json = "{}"] = args.filter((a) => a !== "--no-wait")
if (!model) {
  console.error("Usage: pnpm hf <model-path> '<json input>' [--no-wait]")
  process.exit(2)
}

const credentials =
  process.env.HF_CREDENTIALS?.trim() ||
  (process.env.HF_API_KEY_ID && process.env.HF_API_KEY_SECRET
    ? `${process.env.HF_API_KEY_ID.trim()}:${process.env.HF_API_KEY_SECRET.trim()}`
    : "")
if (!credentials.includes(":")) {
  console.error(
    "Set HF_CREDENTIALS=KEY_ID:KEY_SECRET (or HF_API_KEY_ID and HF_API_KEY_SECRET) in .env.local"
  )
  process.exit(2)
}

let input: Record<string, unknown>
try {
  input = JSON.parse(json) as Record<string, unknown>
} catch {
  console.error("Input must be a JSON object")
  process.exit(2)
}

const client = createHiggsfieldClient({
  credentials,
  baseURL: process.env.HF_API_BASE_URL || "https://api.higgsfield.ai",
  maxRetries: 0,
  maxPollTime: 20 * 60 * 1000,
  headers: { "Idempotency-Key": crypto.randomUUID() },
})

try {
  const result = await client.subscribe(model, { input, withPolling: wait })
  console.log(JSON.stringify(result, null, 2))
} catch (error) {
  console.error(
    error instanceof Error ? `${error.name}: ${error.message}` : error
  )
  process.exit(1)
}
