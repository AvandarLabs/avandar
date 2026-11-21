import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";

/** Asserts the independently authored rendered test contract. */
export function assertPhysicalDestinationKeysNeverKey({
  key,
  pools,
}: Readonly<{ key: string[][number]; pools: Readonly<string[]> }>): void {
  return pools.forEach((pool) => {
    const width = SvgAttributes.getNumberFromMarkup({
        attributes: pool,
        name: "width",
      }),
      height = SvgAttributes.getNumberFromMarkup({
        attributes: pool,
        name: "height",
      });
    if (!width || !height) {
      return;
    }
    const x = SvgAttributes.getNumberFromMarkup({
        attributes: pool,
        name: "x",
      }),
      y = SvgAttributes.getNumberFromMarkup({ attributes: pool, name: "y" }),
      cx = SvgAttributes.getNumberFromMarkup({ attributes: key, name: "cx" }),
      cy = SvgAttributes.getNumberFromMarkup({ attributes: key, name: "cy" });
    assert.ok(
      cx + 8 <= x || cx - 8 >= x + width || cy + 8 <= y || cy - 8 >= y + height,
      "a physical key covers conserved water",
    );
  });
}
