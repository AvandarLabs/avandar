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
});
