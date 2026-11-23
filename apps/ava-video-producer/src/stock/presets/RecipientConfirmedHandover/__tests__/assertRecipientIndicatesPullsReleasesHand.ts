import {
  RecipientConfirmedHandoverTestState,
  type AssertRecipientIndicatesPullsReleasesHandOptions,
} from "./RecipientConfirmedHandoverTestState";

const { render: _render, getUnitCoordinate: _getUnitCoordinate } =
  RecipientConfirmedHandoverTestState;

import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";

/**
 * Asserts recipient indicates, pulls and releases each selected unit with a
 * connected hand.
 */
export function assertRecipientIndicatesPullsReleasesHand({
  hand,
  item,
  frame,
  input,
}: Readonly<AssertRecipientIndicatesPullsReleasesHandOptions>): void {
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: hand[0], name: "cx" }),
    _getUnitCoordinate({ attributes: item[0], axis: "x" }) + 12,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: hand[0], name: "cy" }),
    _getUnitCoordinate({ attributes: item[0], axis: "y" }),
  );
  assert.notEqual(
    _render({ frame: frame - 7, input }).match(
      /<circle data-recipient-hand[^>]*>/,
    )?.[0],
    hand[0],
  );
  assert.notEqual(
    _render({ frame: frame + 7, input }).match(
      /<circle data-recipient-hand[^>]*>/,
    )?.[0],
    hand[0],
  );
}
