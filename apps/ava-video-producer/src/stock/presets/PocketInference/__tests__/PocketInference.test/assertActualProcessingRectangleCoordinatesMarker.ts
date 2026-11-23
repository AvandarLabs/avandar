import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { assertActualProcessingRectangleCoordinatesRectangle as _assertActualProcessingRectangleCoordinatesRectangle } from "./assertActualProcessingRectangleCoordinatesRectangle";
import { type AssertActualProcessingRectangleCoordinatesMarkerOptions } from "./PocketInferenceTestState";

/**
 * Asserts actual processing rectangle coordinates remain within the physical
 * casing at every frame.
 */
export function assertActualProcessingRectangleCoordinatesMarker({
  marker,
  markup,
  boundaryX,
  boundaryY,
  boundary,
}: Readonly<AssertActualProcessingRectangleCoordinatesMarkerOptions>): void {
  const rectangle = markup.match(
    new RegExp(`<rect[^>]*data-${marker}=[^>]*>`),
  )?.[0];
  assert.ok(rectangle);
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: rectangle, name: "x" }) >=
      boundaryX,
  );
  _assertActualProcessingRectangleCoordinatesRectangle({
    rectangle,
    boundaryY,
    boundaryX,
    boundary,
  });
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: rectangle, name: "y" }) +
      SvgAttributes.getNumberFromMarkup({
        attributes: rectangle,
        name: "height",
      }) <=
      boundaryY +
        SvgAttributes.getNumberFromMarkup({
          attributes: boundary,
          name: "height",
        }),
  );
}
