import { describe, expect, it } from "vitest";
import { needsValueExtent } from "@/lib/ui/viz/axis/needsValueExtent/needsValueExtent";

describe("needsValueExtent", () => {
  it("is false for an undefined axis", () => {
    expect(needsValueExtent(undefined)).toBe(false);
  });

  it("is false when only cosmetic settings are present", () => {
    expect(needsValueExtent({ label: "Revenue", tickColor: "#fff" })).toBe(
      false,
    );
  });

  it("is true when a minimum is set", () => {
    expect(needsValueExtent({ min: 0 })).toBe(true);
  });

  it("is true when a maximum is set", () => {
    expect(needsValueExtent({ max: 100 })).toBe(true);
  });

  it("is true when a tick interval is set", () => {
    expect(needsValueExtent({ tickInterval: 25 })).toBe(true);
  });
});
