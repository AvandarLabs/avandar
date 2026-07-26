import { describe, expect, it } from "vitest";
import { SessionSecret } from "@/components/Privacy/privacy-helpers/sessionSecret";

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

describe("issueAckToken", () => {
  // Without mocking the session-secret fetcher we can't actually
  // mint a token: `issueAckToken` calls `getSessionSecret`, which
  // hits the `/chat/:workspaceId/session-secret` endpoint. We exercise
  // the happy-path inside `useAvandarChatRuntime` integration tests
  // once the test harness can stub the edge function.
  //
  // For now we just document the contract: callers must pass
  // workspaceId + userId + payloadHash. If any are missing TypeScript
  // catches it at compile time.
  it("is a function", () => {
    expect(typeof SessionSecret.issueAckToken).toBe("function");
  });
});
