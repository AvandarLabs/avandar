import { OutreachHouseholdRevisitsTestState } from "./OutreachHouseholdRevisitsTestState";

const { render: _render, attributes: _attributes } =
  OutreachHouseholdRevisitsTestState;

import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { DEFAULT_INPUT } from "../../OutreachHouseholdRevisits.fixtures";

/**
 * Asserts repeated activity leaves one contacted household after a later
 * failed contact.
 */
export function assertRepeatedActivityLeavesOneFinal(final: string): void {
  assert.ok(final.includes('data-unique-visited="1"'));
  const house = _attributes({
    markup: final,
    attribute: "data-household-id",
    value: "h1",
  });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: house, name: "data-x" }),
    80 + 0.12 * 480,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: house, name: "data-y" }),
    120 + 0.24 * 270,
  );
  assert.notEqual(
    _attributes({
      markup: _render({ frame: 44, input: DEFAULT_INPUT }),
      attribute: "data-worker",
      value: "worker",
    }),
    _attributes({
      markup: _render({ frame: 90, input: DEFAULT_INPUT }),
      attribute: "data-worker",
      value: "worker",
    }),
  );
}
