import { PooledDonorAllocationTestState } from "./PooledDonorAllocationTestState";

const { getTokenCoordinate: _getTokenCoordinate } =
  PooledDonorAllocationTestState;

import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";

/**
 * Asserts one coordinator slides each configured request batch with a
 * connected scoop.
 */
export function assertOneCoordinatorSlidesConfiguredMoving({
  moving,
  hand,
  support,
}: Readonly<{
  moving: Readonly<RegExpExecArray[]>;
  hand: RegExpMatchArray;
  support: RegExpMatchArray;
}>): void {
  const right =
    Math.max(
      ...moving.map(([attributes]) => {
        return _getTokenCoordinate({ attributes, axis: "x" });
      }),
    ) + 23;
  const bottom =
    Math.max(
      ...moving.map(([attributes]) => {
        return _getTokenCoordinate({ attributes, axis: "y" });
      }),
    ) + 24;
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: hand[0], name: "cx" }),
    right,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: hand[0], name: "cy" }),
    bottom,
  );
  assert.ok(support[0].includes(`${right} ${bottom}`));
}
