import { ReferralReturnAcknowledgementTestState } from "./ReferralReturnAcknowledgementTestState";

const { render: _render, attributes: _attributes } =
  ReferralReturnAcknowledgementTestState;

import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import {
  DEFAULT_INPUT,
  changedInput,
} from "../../ReferralReturnAcknowledgement.fixtures";
import { type Input } from "../../ReferralReturnAcknowledgement.schema";

/** Asserts an independently authored portion of the rendered contract. */
export function assertPeopleCrossIndependentlyPhysicalAfter(
  after: string,
): void {
  assert.ok(!after.includes('data-return-id="r3"'));
  assert.ok(
    !_render({ frame: 150, input: changedInput }).includes("data-return-id="),
  );
  ["person-journey", "return-message"].forEach((emphasis) => {
    const output = _render({
      frame: 150,
      input: {
        ...DEFAULT_INPUT,
        emphasis: emphasis as Input["emphasis"],
        showLedger: false,
      },
    });
    assert.equal(
      SvgAttributes.getNumberFromMarkup({
        attributes: _attributes({
          markup: output,
          attribute: "data-person-id",
          value: "r2",
        }),
        name: "data-x",
      }),
      650,
    );
    assert.ok(!output.includes('data-return-id="r2"'));
  });
}
