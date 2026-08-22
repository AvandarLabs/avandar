import { describe, expect, it } from "vitest";
import { getVisibleAsideWidthPx } from "@/components/Nux/NuxChecklistPanel/getVisibleAsideWidthPx/getVisibleAsideWidthPx";

describe("getVisibleAsideWidthPx", () => {
  it("returns zero when the aside is fully off-screen to the right", () => {
    expect(getVisibleAsideWidthPx({ left: 1200, right: 1580 }, 1200)).toBe(0);
  });

  it("returns the full width when the aside is docked open on the right", () => {
    expect(getVisibleAsideWidthPx({ left: 820, right: 1200 }, 1200)).toBe(380);
  });

  it("returns a partial width while the aside is mid-transition", () => {
    expect(getVisibleAsideWidthPx({ left: 1000, right: 1200 }, 1200)).toBe(200);
  });
});
