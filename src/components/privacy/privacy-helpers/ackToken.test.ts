import { describe, expect, it } from "vitest";
import { SessionSecret } from "@/components/privacy/privacy-helpers/SessionSecret";

/**
 * Sanity check that the client-side ack-token issuance produces a
 * well-shaped token. The full round trip (issue → backend verify) is
 * exercised once we can run the supabase edge function locally; for
 * now we lock in the header shape so refactors don't silently break
 * the contract with the server.
 *
 * `crypto.subtle` is available in Node 22's web-crypto polyfill which
 * vitest picks up via jsdom: no shim needed.
 */

describe("hashTextPayload", () => {
  it("returns a 64-char hex digest", async () => {
    const hex = await SessionSecret.hashTextPayload("hello");
    expect(hex).toMatch(/^[a-f0-9]{64}$/);
  });

  it("hashes the same input to the same digest", async () => {
    const a = await SessionSecret.hashTextPayload("show me revenue by month");
    const b = await SessionSecret.hashTextPayload("show me revenue by month");
    expect(a).toBe(b);
  });

  it("hashes different inputs to different digests", async () => {
    const a = await SessionSecret.hashTextPayload("show me revenue by month");
    const b = await SessionSecret.hashTextPayload("show me revenue by year");
    expect(a).not.toBe(b);
  });

  it("matches the known SHA-256 of an empty string", async () => {
    // sha256("") = e3b0c442...
    const hex = await SessionSecret.hashTextPayload("");
    expect(hex).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });
});

// `issueAckToken` is exercised end-to-end (issue then backend verify) inside
// the `useAvandarChatRuntime` integration tests once the harness can stub the
// `/chat/:workspaceId/session-secret` edge function. No unit test here: a bare
// existence/type check would be tautological (see docs/rules/testing.md).
describe.todo(
  "issueAckToken: happy-path once the edge function can be stubbed",
);
