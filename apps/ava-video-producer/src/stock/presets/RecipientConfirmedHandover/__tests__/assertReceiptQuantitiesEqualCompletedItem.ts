import {
  RecipientConfirmedHandoverTestState,
  type AssertReceiptQuantitiesEqualCompletedItemOptions,
} from "./RecipientConfirmedHandoverTestState";

const { getUnitCoordinate: _getUnitCoordinate } =
  RecipientConfirmedHandoverTestState;

import assert from "node:assert/strict";

/**
 * Asserts receipt quantities equal completed physical moves while each
 * offered unit remains singular.
 */
export function assertReceiptQuantitiesEqualCompletedItem({
  item,
  objects,
  markup,
  frame,
}: Readonly<AssertReceiptQuantitiesEqualCompletedItemOptions>): void {
  const units = objects.filter((match) => {
    return match[1] === item.id;
  });
  assert.equal(units.length, item.offeredUnits);
  assert.equal(
    new Set(
      units.map((match) => {
        return match[2];
      }),
    ).size,
    item.offeredUnits,
  );
  const received = units.filter(([attributes]) => {
    return attributes.includes('data-owner="basket"');
  }).length;
  assert.match(
    markup,
    new RegExp(`data-receipt="${item.id}" data-selected="${received}"`),
  );
  if (frame >= 108) {
    assert.equal(received, item.selectedUnits);
    assert.equal(
      units.filter(([attributes]) => {
        return attributes.includes('data-owner="delivery"');
      }).length,
      item.offeredUnits - item.selectedUnits,
    );
  }
  units.forEach(([attributes]) => {
    const x = _getUnitCoordinate({ attributes, axis: "x" });
    assert.ok(x - 12 >= 193 && x + 12 <= 650);
  });
}
