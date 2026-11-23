import assert from "node:assert/strict";
import { propEq } from "@avandar/utils";
import type { SvgPaintEnvelope } from "../../../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";

/** Asserts address lines remain clear of physical envelope seams. */
export function assertExteriorAddressSeamsFromPaint(
  paint: readonly SvgPaintEnvelope[],
): void {
  const labels = paint.filter(propEq("kind", "text"));
  assert.ok(labels.length > 0);
  labels.forEach((label) => {
    return assert.ok(
      paint.some((item) => {
        return (
          item.kind === "rect" &&
          item.fill !== "none" &&
          item.opacity * item.fillOpacity === 1 &&
          item.paintIndex < label.paintIndex &&
          item.left <= label.left &&
          item.right >= label.right &&
          item.top <= label.top &&
          item.bottom >= label.bottom
        );
      }),
      "Address lines remain clear of physical envelope seams",
    );
  });
}
