import { validateDashboardSlug } from "@sbfn/dashboards/DashboardsRoutes/validateDashboardSlug/validateDashboardSlug.ts";
import { describe, expect, it } from "vitest";

describe("validateDashboardSlug", () => {
  it.each([
    ["", { isValid: false, reason: "empty" }],
    ["has spaces", { isValid: false, reason: "spaces" }],
    ["Uppercase", { isValid: false, reason: "invalid_characters" }],
    ["ab", { isValid: false, reason: "too_short", limit: 3 }],
    ["a".repeat(65), { isValid: false, reason: "too_long", limit: 64 }],
  ] as const)("rejects %s", (slug, expectedFailure) => {
    expect(validateDashboardSlug(slug)).toEqual(expectedFailure);
  });

  it("accepts a lowercase kebab-case slug", () => {
    expect(validateDashboardSlug("public-health-2026")).toBeUndefined();
  });

  it("rejects a UUID-shaped slug so it cannot shadow a dashboard id", () => {
    expect(
      validateDashboardSlug("550e8400-e29b-41d4-a716-446655440000"),
    ).toEqual({ isValid: false, reason: "reserved" });
  });

  it("still accepts a slug that merely contains hex and hyphens", () => {
    expect(validateDashboardSlug("q3-2026-revenue")).toBeUndefined();
  });
});
