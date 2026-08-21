import { describe, expect, it } from "vitest";
import { getNuxChecklistDockRightPx } from "@/components/Nux/NuxChecklistPanel/getNuxChecklistDockRightPx/getNuxChecklistDockRightPx";

describe("getNuxChecklistDockRightPx", () => {
  it("adds the visible aside width to the dock gap", () => {
    expect(
      getNuxChecklistDockRightPx({
        dockGapPx: 16,
        visibleAsideWidthPx: 380,
      }),
    ).toBe(396);
  });

  it("keeps only the dock gap when the aside is hidden", () => {
    expect(
      getNuxChecklistDockRightPx({
        dockGapPx: 16,
        visibleAsideWidthPx: 0,
      }),
    ).toBe(16);
  });

  it("ignores the chat aside while a product modal is open", () => {
    expect(
      getNuxChecklistDockRightPx({
        dockGapPx: 16,
        visibleAsideWidthPx: 380,
        isProductModalOpen: true,
      }),
    ).toBe(16);
  });
});
