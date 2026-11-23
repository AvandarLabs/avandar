import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";

/**
 * Asserts excluded roles lift while only sleeping tiles unroll into the
 * measured strip.
 */
export function assertExcludedRolesLiftWhileTile({
  tile,
  hold,
}: Readonly<{
  tile: (markup: string, id: string) => RegExpExecArray[number];
  hold: string;
}>): void {
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: tile(hold, "a"),
      name: "y",
    }),
    390,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: tile(hold, "a"),
      name: "width",
    }),
    60,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: tile(hold, "c"),
      name: "data-usable-area",
    }),
    0,
  );
  assert.equal((hold.match(/data-place-division=/g) ?? []).length, 7);
}
