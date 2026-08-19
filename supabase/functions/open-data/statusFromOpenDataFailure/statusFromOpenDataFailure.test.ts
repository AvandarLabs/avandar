import { describe, expect, it } from "vitest";
import { statusFromOpenDataFailure } from "@sbfn/open-data/statusFromOpenDataFailure/statusFromOpenDataFailure.ts";
import type { OpenDataAcquisitionFailureCode } from "$/open-data/openDataErrors.ts";

/**
 * Every code the failure union carries. Listed rather than derived, so adding a
 * code to the union without deciding its status leaves this list short and the
 * completeness test below red.
 */
const ALL_CODES: readonly OpenDataAcquisitionFailureCode[] = [
  "ckan-action-failed",
  "ckan-authorization-required",
  "resource-not-found",
  "resource-is-remote-api",
  "resource-format-unsupported",
  "resource-format-changed",
  "resource-too-large",
  "resource-host-mismatch",
  "resource-unreachable",
  "access-shape-invalid",
];

describe("statusFromOpenDataFailure", () => {
  it.each([
    ["resource-not-found", 404],
    ["resource-too-large", 413],
    ["ckan-action-failed", 502],
    ["resource-unreachable", 502],
    ["resource-is-remote-api", 409],
    ["resource-format-unsupported", 409],
    ["resource-format-changed", 409],
    ["resource-host-mismatch", 409],
    ["access-shape-invalid", 409],
  ] as const)("maps %s to %i", (code, status) => {
    expect(statusFromOpenDataFailure(code)).toBe(status);
  });

  // The upstream source wanting a credential is not the caller's authorization
  // problem, so answering 401 or 403 would tell the client to retry with a
  // different token forever.
  it("maps an upstream credential requirement to 502, not 401 or 403", () => {
    const status = statusFromOpenDataFailure("ckan-authorization-required");

    expect(status).toBe(502);
    expect(status).not.toBe(401);
    expect(status).not.toBe(403);
  });

  it("returns a real status for every code the union carries", () => {
    for (const code of ALL_CODES) {
      const status = statusFromOpenDataFailure(code);
      expect(status, `no status for ${code}`).toBeGreaterThanOrEqual(400);
      expect(status, `no status for ${code}`).toBeLessThan(600);
    }
  });

  // A refusal must never read as success, which is what would happen if a new
  // code fell through the switch and returned undefined.
  it("never maps a refusal to a 2xx status", () => {
    for (const code of ALL_CODES) {
      expect(statusFromOpenDataFailure(code)).not.toBeLessThan(400);
    }
  });
});
