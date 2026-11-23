import assert from "node:assert/strict";
import { DEFAULT_INPUT } from "../ReadinessLatch.fixtures";
import { assertFullLabeledResultStaysMarkup as _assertFullLabeledResultStaysMarkup } from "./assertFullLabeledResultStaysMarkup";
import {
  _render,
  _getResultBoundsFromMarkup,
} from "./ReadinessLatchTestHelpers";

/**
 * Asserts the full labeled result stays upstream until a visible opening
 * clears its path.
 */
export function assertFullLabeledResultStaysOrientation(
  orientation: "horizontal" | "vertical",
): void {
  const input = { ...DEFAULT_INPUT, orientation };
  [24, 112, 120, 122, 130].forEach((frame) => {
    const bounds = _getResultBoundsFromMarkup(_render({ frame, input }));
    assert.ok(
      orientation === "horizontal" ? bounds.right < 650 : bounds.bottom < 400,
    );
  });
  const released = _getResultBoundsFromMarkup(_render({ frame: 146, input }));
  assert.ok(
    orientation === "horizontal" ? released.left > 650 : released.top > 400,
  );
  const moving = _getResultBoundsFromMarkup(_render({ frame: 138, input }));
  assert.ok(
    orientation === "horizontal"
      ? moving.left < 650 && moving.right > 650
      : moving.top < 400 && moving.bottom > 400,
  );
  const markup = _render({ frame: 130, input });
  _assertFullLabeledResultStaysMarkup({
    markup,
    orientation,
    moving,
    input,
  });
}
