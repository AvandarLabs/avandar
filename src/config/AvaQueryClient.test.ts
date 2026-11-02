import { describe, expect, it, vi } from "vitest";
import { SessionExpiredError } from "$/ServerApiClient";
import { WorkspaceMembershipDenied } from "@/clients/qetl/assertWorkspaceMembership/WorkspaceMembershipDenied";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import type { Workspace } from "$/models/Workspace/Workspace";

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111" as Workspace.Id;

vi.mock("@avandar/browser-utils", async (importOriginal) => {
  return {
    ...(await importOriginal<typeof import("@avandar/browser-utils")>()),
    getIsOnline: () => {
      return true;
    },
  };
});

/**
 * Reads the shipped retry predicate off the client rather than re-declaring
 * it, so a change to the real configuration is what these tests see.
 */
function _getRetryPredicate(): (
  failureCount: number,
  error: unknown,
) => boolean {
  const { retry } = AvaQueryClient.getDefaultOptions().queries ?? {};
  if (typeof retry !== "function") {
    throw new Error("Expected AvaQueryClient to configure a retry function");
  }
  return retry as (failureCount: number, error: unknown) => boolean;
}

describe("AvaQueryClient retry policy", () => {
  it("retries an ordinary failure once while online", () => {
    // The positive control. Without it, the assertions below would pass just
    // as well against a predicate that refused to retry anything at all.
    const retry = _getRetryPredicate();
    expect(retry(0, new Error("network blip"))).toBe(true);
    expect(retry(1, new Error("network blip"))).toBe(false);
  });

  it("does not retry a workspace authorization refusal", () => {
    // A denial is a decision, not a fault: the retry would repeat the same
    // membership read, reach the same answer, and only delay the error.
    const retry = _getRetryPredicate();
    const denial = new WorkspaceMembershipDenied({
      code: "not-a-member",
      workspaceId: WORKSPACE_ID,
    });
    expect(retry(0, denial)).toBe(false);
  });

  it.each(["not-authenticated", "principal-mismatch", "not-a-member"] as const)(
    "does not retry a denial with code %s",
    (code) => {
      const retry = _getRetryPredicate();
      expect(
        retry(
          0,
          new WorkspaceMembershipDenied({ code, workspaceId: WORKSPACE_ID }),
        ),
      ).toBe(false);
    },
  );

  it("still does not retry an expired session", () => {
    // Pins the pre-existing branch, so adding the denial case above cannot
    // quietly displace it.
    const retry = _getRetryPredicate();
    expect(retry(0, new SessionExpiredError("/datasets"))).toBe(false);
  });
});
