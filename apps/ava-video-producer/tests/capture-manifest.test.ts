import assert from "node:assert/strict";
import test from "node:test";
import {
  assertSafeManifest,
  sanitizeText,
  sourceUrl,
} from "../scripts/capture-lib.mjs";

test("manifest sanitization removes credentials and URL queries; secret containers are rejected", () => {
  const jwt =
    "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signaturelongvalue";
  const text = sanitizeText(
    `user@example.test password=capture-secret Bearer opaque-secret ${jwt} https://api.test/path?signed=private#fragment`,
    ["capture-secret"],
  );
  for (const secret of [
    "user@example.test",
    "capture-secret",
    "opaque-secret",
    jwt,
    "signed=private",
    "#fragment",
  ])
    assert.equal(text.includes(secret), false);
  assert.equal(
    sourceUrl("https://name:pass@example.test/path?token=secret#hash"),
    "https://example.test/path",
  );
  assertSafeManifest(
    {
      authentication: { status: "passed" },
      sourceUrl: "http://localhost:5173/avandar-labs",
    },
    ["avandar"],
  );
  for (const record of [
    { nested: { password: "anything" } },
    { cookies: [] },
    { storageState: {} },
    { value: jwt },
    { message: "contains capture-secret" },
  ]) {
    assert.throws(
      () => assertSafeManifest(record, ["capture-secret"]),
      /Credential|credential/,
    );
  }
});
