import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { type Input } from "../ReadinessLatch.schema";
import {
  _render,
  _getResultBoundsFromMarkup,
} from "./ReadinessLatchTestHelpers";

/**
 * Asserts the full labeled result stays upstream until a visible opening
 * clears its path.
 */
export function assertFullLabeledResultStaysFrame({
  frame,
  input,
}: Readonly<{ frame: number; input: Readonly<Input> }>): void {
  const sample = _render({ frame, input });
  const bounds = _getResultBoundsFromMarkup(sample);
  const label = sample.match(
    new RegExp(`<text aria-label="${input.sharedAction}"[^>]*>`),
  );
  assert.ok(label);
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: label[0], name: "x" }) >=
      bounds.left,
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: label[0], name: "x" }) <
      bounds.right,
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: label[0], name: "y" }) >
      bounds.top,
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: label[0], name: "y" }) <
      bounds.bottom,
  );
}
