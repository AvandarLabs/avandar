import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { type AssertActualProcessingRectangleCoordinatesRectangleOptions } from "./PocketInferenceTestState";

/**
 * Asserts actual processing rectangle coordinates remain within the physical
 * casing at every frame.
 */
export function assertActualProcessingRectangleCoordinatesRectangle({
  rectangle,
  boundaryY,
  boundaryX,
  boundary,
}: Readonly<AssertActualProcessingRectangleCoordinatesRectangleOptions>): void {
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: rectangle, name: "y" }) >=
      boundaryY,
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: rectangle, name: "x" }) +
      SvgAttributes.getNumberFromMarkup({
        attributes: rectangle,
        name: "width",
      }) <=
      boundaryX +
        SvgAttributes.getNumberFromMarkup({
          attributes: boundary,
          name: "width",
        }),
  );
}
