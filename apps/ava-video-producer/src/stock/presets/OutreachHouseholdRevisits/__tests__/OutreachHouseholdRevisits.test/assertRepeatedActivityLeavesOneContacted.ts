import { OutreachHouseholdRevisitsTestState } from "./OutreachHouseholdRevisitsTestState";

const { attributes: _attributes } = OutreachHouseholdRevisitsTestState;

import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";

/**
 * Asserts repeated activity leaves one contacted household after a later
 * failed contact.
 */
export function assertRepeatedActivityLeavesOneContacted({
  contacted,
  final,
}: Readonly<{ contacted: string; final: string }>): void {
  assert.ok(
    _attributes({
      markup: contacted,
      attribute: "data-household-id",
      value: "h1",
    }).includes('data-state="contacted"'),
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: _attributes({
        markup: final,
        attribute: "data-household-id",
        value: "h1",
      }),
      name: "data-events",
    }),
    3,
  );
  assert.ok(
    _attributes({
      markup: final,
      attribute: "data-household-id",
      value: "h1",
    }).includes('data-state="contacted"'),
  );
  assert.equal((final.match(/data-visit-stamp=/g) ?? []).length, 3);
}
