import assert from "node:assert/strict";
import test from "node:test";
import { CaptureSanitization } from "../CaptureSanitization";
import { CaptureUrlSafety } from "../CaptureUrlSafety/CaptureUrlSafety";

test("manifest sanitization removes credentials and URL queries; secret containers are rejected", () => {
  const jwt =
    "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signaturelongvalue";
  const text = CaptureSanitization.makeRedactedTextFromValue({
    value: `user@example.test password=capture-secret Bearer opaque-secret ${jwt} https://api.test/path?signed=private#fragment`,
    secrets: ["capture-secret"],
  });
  [
    "user@example.test",
    "capture-secret",
    "opaque-secret",
    jwt,
    "signed=private",
    "#fragment",
  ].forEach((secret) => {
    assert.equal(text.includes(secret), false);
  });
  assert.equal(
    CaptureUrlSafety.makeSourceUrlFromUrl(
      "https://name:pass@example.test/path?token=secret#hash",
    ),
    "https://example.test/path",
  );
  CaptureSanitization.assertSafeManifest({
    value: {
      authentication: { status: "passed" },
      sourceUrl: "http://localhost:5173/avandar-labs",
    },
    secrets: ["avandar"],
  });
  [
    { nested: { password: "anything" } },
    { cookies: [] },
    { storageState: {} },
    { value: jwt },
    { message: "contains capture-secret" },
  ].forEach((record) => {
    assert.throws(() => {
      return CaptureSanitization.assertSafeManifest({
        value: record,
        secrets: ["capture-secret"],
      });
    }, /Credential|credential/);
  });
});
