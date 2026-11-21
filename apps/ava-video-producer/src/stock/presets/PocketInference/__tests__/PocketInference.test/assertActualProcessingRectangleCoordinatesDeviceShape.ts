import { PocketInferenceTestState } from "./PocketInferenceTestState";

const { render: _render } = PocketInferenceTestState;
import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { fixtures } from "../../PocketInference.fixtures";
import { assertActualProcessingRectangleCoordinatesMarker as _assertActualProcessingRectangleCoordinatesMarker } from "./assertActualProcessingRectangleCoordinatesMarker";

/**
 * Asserts actual processing rectangle coordinates remain within the physical
 * casing at every frame.
 */
export function assertActualProcessingRectangleCoordinatesDeviceShape(
  deviceShape: "phone" | "tablet" | "laptop",
): void {
  for (let frame = 0; frame < 180; frame++) {
    const markup = _render({
      frame: frame,
      input: { ...fixtures[2].input, deviceShape },
    });
    const boundary = markup.match(/<rect[^>]*data-device-boundary=[^>]*>/)?.[0];
    assert.ok(boundary);
    const boundaryX = SvgAttributes.getNumberFromMarkup({
        attributes: boundary,
        name: "x",
      }),
      boundaryY = SvgAttributes.getNumberFromMarkup({
        attributes: boundary,
        name: "y",
      });
    Array.from([
      "model-cartridge",
      "internal-input",
      "internal-response",
    ]).forEach((marker) => {
      return _assertActualProcessingRectangleCoordinatesMarker({
        marker,
        markup,
        boundaryX,
        boundaryY,
        boundary,
      });
    });
  }
}
