import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";

/**
 * Asserts every physical unit stays unique and handled units contact the
 * active actor hand.
 */
export function assertEveryPhysicalUnitStaysUnits({
  units,
  markup,
}: Readonly<{ units: Readonly<RegExpExecArray[]>; markup: string }>): void {
  units
    .filter((unit) => {
      return unit[3] === "retailer-hand" || unit[3] === "shopper-hand";
    })
    .forEach((unit) => {
      const hand = markup.match(new RegExp(`<circle data-${unit[3]}[^>]*>`));
      assert.ok(hand);
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: hand[0], name: "cx" }),
        Number(unit[4]) + 12,
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: hand[0], name: "cy" }),
        Number(unit[5]),
      );
    });
}
