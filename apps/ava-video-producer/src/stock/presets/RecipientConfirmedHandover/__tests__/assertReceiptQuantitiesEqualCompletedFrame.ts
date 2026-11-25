import { RecipientConfirmedHandoverTestState } from "./RecipientConfirmedHandoverTestState";

const { render: _render } = RecipientConfirmedHandoverTestState;
import assert from "node:assert/strict";
import { type Input } from "../RecipientConfirmedHandover.schema";
import { assertReceiptQuantitiesEqualCompletedItem as _assertReceiptQuantitiesEqualCompletedItem } from "./assertReceiptQuantitiesEqualCompletedItem";

/**
 * Asserts receipt quantities equal completed physical moves while each
 * offered unit remains singular.
 */
export function assertReceiptQuantitiesEqualCompletedFrame({
  frame,
  input,
}: Readonly<{ frame: number[][number]; input: Readonly<Input> }>): void {
  const markup = _render({ frame, input });
  const objects = [
    ...markup.matchAll(/<g data-good="([^"]*)" data-unit="([^"]*)"[^>]*>/g),
  ];
  assert.equal(
    objects.length,
    input.contents.reduce((sum, item) => {
      return sum + item.offeredUnits;
    }, 0),
  );
  input.contents.forEach((item) => {
    return _assertReceiptQuantitiesEqualCompletedItem({
      item,
      objects,
      markup,
      frame,
    });
  });
}
