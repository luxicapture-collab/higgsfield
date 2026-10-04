import assert from "node:assert/strict";
import { test } from "node:test";
import {
  decodeCredentials,
  encodeCredentials,
  parseCredentialInput,
  toAuthorizationHeader,
} from "../generation/credentials.ts";

test("pasted API keys survive saving and retain the Key authorization scheme", () => {
  for (const apiKey of ["test_api_key", "test-id:test-secret"]) {
    for (const field of ["apiKey", "api_key"]) {
      assert.deepEqual(parseCredentialInput({ [field]: `  ${apiKey}\n` }), { apiKey });
    }
    assert.deepEqual(decodeCredentials(encodeCredentials(apiKey)), { apiKey });
    assert.equal(toAuthorizationHeader(apiKey), `Key ${apiKey}`);
  }
});

test("invalid keys cannot be saved or turned into authorization headers", () => {
  for (const input of [null, [], {}, { apiKey: 123 }, { apiKey: "  " }]) {
    assert.throws(() => parseCredentialInput(input), /Enter an API key/);
  }
  for (const apiKey of ["", "  ", "test key", "test\r\nInjected: value", "test\0key"]) {
    assert.throws(() => parseCredentialInput({ apiKey }), /API key/);
    assert.throws(() => toAuthorizationHeader(apiKey), /API key/);
    assert.equal(decodeCredentials(encodeCredentials(apiKey)), null);
  }
  for (const raw of [undefined, "not-json", "null", "[]", '{"apiKey":123}']) {
    assert.equal(decodeCredentials(raw), null);
  }
});

test("env key fallback joins id and secret, and is off in production", async () => {
  const { readEnvCredentials, parseIdempotencyKey } = await import("../generation/credentials.ts");
  const env = { HF_API_KEY_ID: " id ", HF_API_KEY_SECRET: "secret", NODE_ENV: "development" };
  assert.deepEqual(readEnvCredentials(env), { apiKey: "id:secret" });
  assert.equal(readEnvCredentials({ ...env, NODE_ENV: "production" }), null);
  assert.equal(readEnvCredentials({ HF_API_KEY_ID: "id" }), null);
  const uuid = "0F8FAD5B-D9CB-469F-A165-70867728950E";
  assert.equal(parseIdempotencyKey(uuid), uuid.toLowerCase());
  assert.equal(parseIdempotencyKey("nope"), undefined);
});
