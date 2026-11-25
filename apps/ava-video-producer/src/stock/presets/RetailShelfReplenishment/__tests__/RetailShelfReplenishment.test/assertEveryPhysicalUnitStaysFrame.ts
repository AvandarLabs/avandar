import { RetailShelfReplenishmentTestState } from "./RetailShelfReplenishmentTestState";

const { render: _render } = RetailShelfReplenishmentTestState;
import assert from "node:assert/strict";
import { type Input } from "../../RetailShelfReplenishment.schema";
import { assertEveryPhysicalUnitStaysUnits as _assertEveryPhysicalUnitStaysUnits } from "./assertEveryPhysicalUnitStaysUnits";

/**
 * Asserts every physical unit stays unique and handled units contact the
 * active actor hand.
 */
export function assertEveryPhysicalUnitStaysFrame({
  frame,
  input,
}: Readonly<{ frame: number[][number]; input: Readonly<Input> }>): void {
  const markup = _render({ frame: frame, input: input });
  const units = [
    ...markup.matchAll(
      /<g data-good="([^"]*)" data-unit="([^"]*)" data-owner="([^"]*)"[^>]*transform="translate\(([^ ]+) ([^)]+)\)"/g,
    ),
  ];
  assert.equal(
    units.length,
    input.goods.reduce((sum, good) => {
      return sum + good.openingUnits + good.incomingUnits;
    }, 0),
  );
  assert.equal(
    new Set(
      units.map((unit) => {
        return `${unit[1]}:${unit[2]}`;
      }),
    ).size,
    units.length,
  );
  _assertEveryPhysicalUnitStaysUnits({ units, markup });
  if (frame === 150) {
    input.goods.forEach((good) => {
      const own = units.filter((unit) => {
        return unit[1] === good.id;
      });
      assert.equal(
        own.filter((unit) => {
          return unit[3] === "shelf";
        }).length,
        good.openingUnits + good.incomingUnits - good.selectedUnits,
      );
      assert.equal(
        own.filter((unit) => {
          return unit[3] === "basket";
        }).length,
        good.selectedUnits,
      );
    });
  }
}
