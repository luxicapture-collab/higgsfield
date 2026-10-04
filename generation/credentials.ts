export const PLATFORM_KEY_COOKIE = "api_key"

export const PLATFORM_KEY_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
}

export class MissingCredentialsError extends Error {
  constructor() {
    super("Connect your Higgsfield API key")
    this.name = "MissingCredentialsError"
  }
}

export function encodeCredentials(apiKey: string): string {
  return JSON.stringify({ apiKey })
}

export function decodeCredentials(
  raw: string | undefined
): { apiKey: string } | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as unknown
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed))
      return null
    const apiKey = (parsed as { apiKey?: unknown }).apiKey
    if (typeof apiKey !== "string" || !apiKey.trim()) return null
    return { apiKey: requireApiKey(apiKey) }
  } catch {
    return null
  }
}

/** Local-development fallback: a server-only key from HF_CREDENTIALS (or
    HF_API_KEY_ID + HF_API_KEY_SECRET), used only when no key was pasted. Never active in
    production, where the app has no login to stop strangers spending it. */
export function readEnvCredentials(
  env: Record<string, string | undefined> = process.env
): { apiKey: string } | null {
  if (env.NODE_ENV === "production") return null
  const id = env.HF_API_KEY_ID?.trim()
  const secret = env.HF_API_KEY_SECRET?.trim()
  const joined =
    env.HF_CREDENTIALS?.trim() || (id && secret ? `${id}:${secret}` : "")
  if (!joined) return null
  try {
    return { apiKey: requireApiKey(joined) }
  } catch {
    return null
  }
}

/** Fresh UUID per Generate click; anything else is dropped. */
export function parseIdempotencyKey(value: unknown): string | undefined {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value
    )
    ? value.toLowerCase()
    : undefined
}

export function parseCredentialInput(data: unknown): { apiKey: string } {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Enter an API key")
  }
  const record = data as { apiKey?: unknown; api_key?: unknown }
  const apiKey = record.apiKey ?? record.api_key
  if (typeof apiKey !== "string" || !apiKey.trim())
    throw new Error("Enter an API key")
  return { apiKey: requireApiKey(apiKey) }
}

export function toAuthorizationHeader(apiKey: string): string {
  return `Key ${requireApiKey(apiKey)}`
}

function requireApiKey(apiKey: string): string {
  const key = apiKey.trim()
  if (!key) throw new Error("Enter an API key")
  if (/[^\x21-\x7E]/.test(key))
    throw new Error(
      "Paste the API key exactly as copied from open.higgsfield.ai"
    )
  return key
}
