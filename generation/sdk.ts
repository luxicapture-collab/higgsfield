import "server-only"

import { APIError, AuthenticationError } from "@higgsfield/client"
import { createHiggsfieldClient } from "@higgsfield/client/v2"

import { PlatformError } from "./platform"

/**
 * Submit through the official SDK (`@higgsfield/client/v2`). The SDK only
 * exposes `subscribe`, so status, cancel and uploads stay on the REST client
 * in `platform.ts` with the same `Authorization: Key …` header.
 *
 * - `withPolling: false`: the Studio polls and cancels on its own.
 * - `maxRetries: 0`: the SDK otherwise re-POSTs on timeouts and 5xx, which can
 *   start a second paid generation after an ambiguous failure.
 * - Credentials are always passed explicitly; the SDK would otherwise fall
 *   back to HF_CREDENTIALS / HF_API_KEY from the environment.
 */
export async function sdkSubmit(options: {
  apiKey: string
  baseUrl: string
  model: string
  input: Record<string, unknown>
  idempotencyKey?: string
}): Promise<unknown> {
  const client = createHiggsfieldClient({
    credentials: options.apiKey,
    baseURL: options.baseUrl,
    maxRetries: 0,
    ...(options.idempotencyKey
      ? { headers: { "Idempotency-Key": options.idempotencyKey } }
      : {}),
  })
  try {
    return await client.subscribe(options.model, {
      input: options.input,
      withPolling: false,
    })
  } catch (error) {
    throw toPlatformError(error)
  }
}

/** The SDK requires the KEY_ID:KEY_SECRET form. */
export function isSdkCredential(apiKey: string): boolean {
  const i = apiKey.indexOf(":")
  return i > 0 && i < apiKey.length - 1
}

/** Keep the HTTP status the Studio's error handling keys on. */
function toPlatformError(error: unknown): unknown {
  if (error instanceof AuthenticationError)
    return new PlatformError(401, { detail: "Invalid API key" })
  if (error instanceof APIError) {
    const data: unknown = error.responseData
    const detail =
      data && typeof data === "object" && "detail" in data
        ? data.detail
        : undefined
    return new PlatformError(error.statusCode ?? 502, {
      detail:
        typeof detail === "string" && detail
          ? detail
          : detail !== undefined
            ? JSON.stringify(detail)
            : error.message,
    })
  }
  return error
}
