/**
 * Unit tests for the Data Explorer drawer's height math: the clamp applied to
 * a requested height and the keyboard resize steps on the resize separator.
 */
import { describe, expect, it } from "vitest";
import {
  clampDrawerHeight,
  DRAWER_MIN_HEIGHT,
  resolveDrawerHeightForKey,
} from "@/views/DataExplorerApp/DataExplorerDrawer/drawerHeight/drawerHeight";

describe("clampDrawerHeight", () => {
  it("keeps a height that already fits inside the canvas", () => {
    expect(clampDrawerHeight({ requestedHeight: 300, canvasHeight: 900 })).toBe(
      300,
    );
  });

  it("raises a height below the minimum up to the minimum", () => {
    expect(clampDrawerHeight({ requestedHeight: 40, canvasHeight: 900 })).toBe(
      DRAWER_MIN_HEIGHT,
    );
  });

  it("caps the height so the chart keeps at least 40% of the canvas", () => {
    // 60% of 900 is 540, so a 800px request is capped there.
    expect(clampDrawerHeight({ requestedHeight: 800, canvasHeight: 900 })).toBe(
      540,
    );
  });

  it("lets the minimum win on a canvas too short to honor the cap", () => {
    // 60% of 200 is 120, which is below the 180px minimum. The drawer stays
    // usable rather than collapsing to a sliver.
    expect(clampDrawerHeight({ requestedHeight: 300, canvasHeight: 200 })).toBe(
      DRAWER_MIN_HEIGHT,
    );
  });

  it("falls back to the minimum-only clamp before the canvas is measured", () => {
    expect(clampDrawerHeight({ requestedHeight: 420, canvasHeight: 0 })).toBe(
      420,
    );
    expect(clampDrawerHeight({ requestedHeight: 10, canvasHeight: 0 })).toBe(
      DRAWER_MIN_HEIGHT,
    );
  });

  it("rounds fractional pointer positions to whole pixels", () => {
    expect(
      clampDrawerHeight({ requestedHeight: 300.6, canvasHeight: 900 }),
    ).toBe(301);
  });
});

describe("resolveDrawerHeightForKey", () => {
  const canvasHeight = 900;

  it("grows the drawer on ArrowUp because the drawer extends upward", () => {
    expect(
      resolveDrawerHeightForKey({
        key: "ArrowUp",
        isShiftPressed: false,
        currentHeight: 300,
        canvasHeight,
      }),
    ).toBe(316);
  });

  it("shrinks the drawer on ArrowDown", () => {
    expect(
      resolveDrawerHeightForKey({
        key: "ArrowDown",
        isShiftPressed: false,
        currentHeight: 300,
        canvasHeight,
      }),
    ).toBe(284);
  });

  it("uses a coarse step while Shift is held", () => {
    expect(
      resolveDrawerHeightForKey({
        key: "ArrowUp",
        isShiftPressed: true,
        currentHeight: 300,
        canvasHeight,
      }),
    ).toBe(348);
  });

  it("jumps to the tallest allowed height on Home", () => {
    expect(
      resolveDrawerHeightForKey({
        key: "Home",
        isShiftPressed: false,
        currentHeight: 300,
        canvasHeight,
      }),
    ).toBe(540);
  });

  it("jumps to the shortest allowed height on End", () => {
    expect(
      resolveDrawerHeightForKey({
        key: "End",
        isShiftPressed: false,
        currentHeight: 300,
        canvasHeight,
      }),
    ).toBe(DRAWER_MIN_HEIGHT);
  });

  it("clamps a step that would overshoot the cap", () => {
    expect(
      resolveDrawerHeightForKey({
        key: "ArrowUp",
        isShiftPressed: true,
        currentHeight: 530,
        canvasHeight,
      }),
    ).toBe(540);
  });

  it("ignores keys that do not resize", () => {
    expect(
      resolveDrawerHeightForKey({
        key: "Enter",
        isShiftPressed: false,
        currentHeight: 300,
        canvasHeight,
      }),
    ).toBeUndefined();
  });
});
