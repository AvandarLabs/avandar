import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { type Input } from "../ReadinessLatch.schema";
import {
  _render,
  _getAttributesFromMarkup,
  _getResultBoundsFromMarkup,
} from "./ReadinessLatchTestHelpers";

/**
 * Asserts work quantities complete out of array order before the common
 * release at 122.
 */
export function assertWorkQuantitiesCompleteOutInput(
  input: Readonly<Input>,
): void {
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: _getAttributesFromMarkup({
        markup: _render({ frame: 50, input }),
        id: "slow",
        kind: "pin",
      }),
      name: "x1",
    }),
    640,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: _getAttributesFromMarkup({
        markup: _render({ frame: 112, input }),
        id: "slow",
        kind: "ribbon",
      }),
      name: "width",
    }),
    350,
  );
  assert.ok(
    _getResultBoundsFromMarkup(_render({ frame: 122, input })).right < 650,
  );
}
