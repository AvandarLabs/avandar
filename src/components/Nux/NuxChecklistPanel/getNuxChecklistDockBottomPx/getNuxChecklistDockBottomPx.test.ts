import { describe, expect, it } from "vitest";
import { getNuxChecklistDockBottomPx } from "@/components/Nux/NuxChecklistPanel/getNuxChecklistDockBottomPx/getNuxChecklistDockBottomPx";

describe("getNuxChecklistDockBottomPx", () => {
  it("adds the sticky action bar's height to the dock gap", () => {
    expect(
      getNuxChecklistDockBottomPx({
        dockGapPx: 16,
        stickyActionBarHeightPx: 72,
      }),
    ).toBe(88);
  });

  it("keeps only the dock gap when no action bar is on screen", () => {
    expect(
      getNuxChecklistDockBottomPx({
        dockGapPx: 16,
        stickyActionBarHeightPx: 0,
      }),
    ).toBe(16);
  });

  // A bar scrolled fully below the fold measures as a negative intrusion, and
  // adding that would pull the dock off the bottom of the viewport.
  it("keeps only the dock gap for a negative height", () => {
    expect(
      getNuxChecklistDockBottomPx({
        dockGapPx: 16,
        stickyActionBarHeightPx: -40,
      }),
    ).toBe(16);
  });
});
