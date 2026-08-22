import { describe, expect, it } from "vitest";

import { doesAxisNeedValueExtent } from "@/lib/ui/viz/axis/doesAxisNeedValueExtent/doesAxisNeedValueExtent";

describe("doesAxisNeedValueExtent", () => {
  it("is false for an undefined axis", () => {
    expect(doesAxisNeedValueExtent(undefined)).toBe(false);
  });

  it("is false when only cosmetic settings are present", () => {
    expect(
      doesAxisNeedValueExtent({ label: "Revenue", tickColor: "#fff" }),
    ).toBe(false);
  });

  it("is true when a minimum is set", () => {
    expect(doesAxisNeedValueExtent({ min: 0 })).toBe(true);
  });

  it("is true when a maximum is set", () => {
    expect(doesAxisNeedValueExtent({ max: 100 })).toBe(true);
  });

  it("is true when a tick interval is set", () => {
    expect(doesAxisNeedValueExtent({ tickInterval: 25 })).toBe(true);
  });
});
