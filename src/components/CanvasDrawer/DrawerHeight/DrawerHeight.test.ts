/**
 * Unit tests for canvas-drawer height math: the clamp applied to a requested
 * height and the keyboard resize steps on the resize separator.
 *
 * `availableHeight` is the height of the whole region the canvas and the
 * drawer split between them, so 900 below stands for that combined region.
 */
import { describe, expect, it } from "vitest";
import { DrawerHeight } from "@/components/CanvasDrawer/DrawerHeight/DrawerHeight";

describe("DrawerHeight.clamp", () => {
  it("keeps a height that already fits inside the region", () => {
    expect(
      DrawerHeight.clamp({ requestedHeight: 300, availableHeight: 900 }),
    ).toBe(300);
  });

  it("raises a height below the minimum up to the minimum", () => {
    expect(
      DrawerHeight.clamp({ requestedHeight: 40, availableHeight: 900 }),
    ).toBe(DrawerHeight.MIN_HEIGHT);
  });

  it("caps the height so the canvas keeps at least 40% of the region", () => {
    // 60% of 900 is 540, so an 800px request is capped there.
    expect(
      DrawerHeight.clamp({ requestedHeight: 800, availableHeight: 900 }),
    ).toBe(540);
  });

  it("lets the minimum win on a region too short to honor the cap", () => {
    // 60% of 200 is 120, which is below the 180px minimum. The drawer stays
    // usable rather than collapsing to a sliver.
    expect(
      DrawerHeight.clamp({ requestedHeight: 300, availableHeight: 200 }),
    ).toBe(DrawerHeight.MIN_HEIGHT);
  });

  it("falls back to the minimum-only clamp before the region is measured", () => {
    expect(
      DrawerHeight.clamp({ requestedHeight: 420, availableHeight: 0 }),
    ).toBe(420);
    expect(
      DrawerHeight.clamp({ requestedHeight: 10, availableHeight: 0 }),
    ).toBe(DrawerHeight.MIN_HEIGHT);
  });

  it("rounds fractional pointer positions to whole pixels", () => {
    expect(
      DrawerHeight.clamp({ requestedHeight: 300.6, availableHeight: 900 }),
    ).toBe(301);
  });
});

describe("DrawerHeight.getMaxHeight", () => {
  it("reports the share of the region the drawer may occupy", () => {
    expect(DrawerHeight.getMaxHeight(900)).toBe(540);
  });

  it("never reports a cap below the minimum height", () => {
    expect(DrawerHeight.getMaxHeight(200)).toBe(DrawerHeight.MIN_HEIGHT);
  });

  it("reports no cap for an unmeasured region", () => {
    expect(DrawerHeight.getMaxHeight(0)).toBeUndefined();
  });
});

describe("DrawerHeight.getHeightForKey", () => {
  const availableHeight = 900;

  it("grows the drawer on ArrowUp because the drawer extends upward", () => {
    expect(
      DrawerHeight.getHeightForKey({
        key: "ArrowUp",
        isShiftPressed: false,
        currentHeight: 300,
        availableHeight,
      }),
    ).toBe(316);
  });

  it("shrinks the drawer on ArrowDown", () => {
    expect(
      DrawerHeight.getHeightForKey({
        key: "ArrowDown",
        isShiftPressed: false,
        currentHeight: 300,
        availableHeight,
      }),
    ).toBe(284);
  });

  it("uses a coarse step while Shift is held", () => {
    expect(
      DrawerHeight.getHeightForKey({
        key: "ArrowUp",
        isShiftPressed: true,
        currentHeight: 300,
        availableHeight,
      }),
    ).toBe(348);
  });

  it("jumps to the tallest allowed height on Home", () => {
    expect(
      DrawerHeight.getHeightForKey({
        key: "Home",
        isShiftPressed: false,
        currentHeight: 300,
        availableHeight,
      }),
    ).toBe(540);
  });

  it("jumps to the shortest allowed height on End", () => {
    expect(
      DrawerHeight.getHeightForKey({
        key: "End",
        isShiftPressed: false,
        currentHeight: 300,
        availableHeight,
      }),
    ).toBe(DrawerHeight.MIN_HEIGHT);
  });

  it("clamps a step that would overshoot the cap", () => {
    expect(
      DrawerHeight.getHeightForKey({
        key: "ArrowUp",
        isShiftPressed: true,
        currentHeight: 530,
        availableHeight,
      }),
    ).toBe(540);
  });

  it("ignores keys that do not resize", () => {
    expect(
      DrawerHeight.getHeightForKey({
        key: "Enter",
        isShiftPressed: false,
        currentHeight: 300,
        availableHeight,
      }),
    ).toBeUndefined();
  });
});
