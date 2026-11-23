import assert from "node:assert/strict";
import { assertMarkingHandsContactSelectedMarkup as _assertMarkingHandsContactSelectedMarkup } from "./assertMarkingHandsContactSelectedMarkup";
import { type AssertMarkingHandsContactSelectedMarkupGuideOptions } from "./SharedJigPreparationTestState";

/**
 * Asserts marking hands contact the selected cutout and paint above the
 * opaque guide.
 */
export function assertMarkingHandsContactSelectedMarkupGuide({
  markup,
  guide,
  tool,
  pattern,
  handX,
  handY,
  radius,
  arm,
  x,
  y,
}: Readonly<AssertMarkingHandsContactSelectedMarkupGuideOptions>): void {
  _assertMarkingHandsContactSelectedMarkup({
    markup,
    guide,
    tool,
    pattern,
    handX,
    handY,
    radius,
    arm,
  });
  if (pattern === "corner-mark") {
    assert.ok(
      x - radius >= 0 &&
        x + radius <= 22 &&
        y - radius >= 0 &&
        y + radius <= 22,
      `corner hand [${x}, ${y}] misses notch`,
    );
  } else {
    assert.ok(
      Math.min(Math.hypot(x - 30, y - 32), Math.hypot(x - 70, y - 32)) +
        radius <=
        7,
    );
  }
}
