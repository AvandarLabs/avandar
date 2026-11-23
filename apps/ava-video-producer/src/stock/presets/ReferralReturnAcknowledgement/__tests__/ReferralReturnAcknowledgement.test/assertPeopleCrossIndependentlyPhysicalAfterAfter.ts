import { ReferralReturnAcknowledgementTestState } from "./ReferralReturnAcknowledgementTestState";

const { attributes: _attributes } = ReferralReturnAcknowledgementTestState;
import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { assertPeopleCrossIndependentlyPhysicalAfter as _assertPeopleCrossIndependentlyPhysicalAfter } from "./assertPeopleCrossIndependentlyPhysicalAfter";

/**
 * Asserts people cross independently from the physical acknowledgement that
 * returns.
 */
export function assertPeopleCrossIndependentlyPhysicalAfterAfter(
  after: string,
): void {
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: _attributes({
        markup: after,
        attribute: "data-person-id",
        value: "r3",
      }),
      name: "data-x",
    }),
    180,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: _attributes({
        markup: after,
        attribute: "data-return-id",
        value: "r1",
      }),
      name: "x",
    }),
    228,
  );
  assert.ok(!after.includes('data-return-id="r2"'));
  _assertPeopleCrossIndependentlyPhysicalAfter(after);
}
