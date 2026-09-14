import { describe, expect, it } from "vitest";
import { getStickyActionBarIntrusionPx } from "@/lib/hooks/ui/useStickyActionBarInset/getStickyActionBarIntrusionPx/getStickyActionBarIntrusionPx";

describe("getStickyActionBarIntrusionPx", () => {
  it("measures from the viewport's bottom edge to the bar's top", () => {
    expect(
      getStickyActionBarIntrusionPx({
        barRect: { top: 828 },
        viewportHeight: 900,
      }),
    ).toBe(72);
  });

  // The gap between the bar's bottom and the viewport's counts: the dock has
  // to clear the bar's top edge wherever the bar's own bottom happens to sit.
  it("includes the slate's padding below the bar", () => {
    expect(
      getStickyActionBarIntrusionPx({
        barRect: { top: 800 },
        viewportHeight: 900,
      }),
    ).toBe(100);
  });

  it("is zero for a bar scrolled past the fold", () => {
    expect(
      getStickyActionBarIntrusionPx({
        barRect: { top: 1200 },
        viewportHeight: 900,
      }),
    ).toBe(0);
  });

  // A bar taller than the viewport would otherwise push the dock off the top.
  it("never exceeds the viewport height", () => {
    expect(
      getStickyActionBarIntrusionPx({
        barRect: { top: -300 },
        viewportHeight: 900,
      }),
    ).toBe(900);
  });
});
