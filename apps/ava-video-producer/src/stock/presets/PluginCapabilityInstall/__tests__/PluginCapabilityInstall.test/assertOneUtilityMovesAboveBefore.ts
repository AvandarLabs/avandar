import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";

/**
 * Asserts one utility moves from above the empty socket into its exact
 * opening.
 */
export function assertOneUtilityMovesAboveBefore({
  before,
  socket,
  after,
}: Readonly<{
  before: RegExpMatchArray[number];
  socket: RegExpMatchArray[number];
  after: RegExpMatchArray[number];
}>): void {
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: before, name: "y" }) +
      SvgAttributes.getNumberFromMarkup({
        attributes: before,
        name: "height",
      }) <
      SvgAttributes.getNumberFromMarkup({ attributes: socket, name: "y" }),
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: after, name: "y" }) >=
      SvgAttributes.getNumberFromMarkup({ attributes: socket, name: "y" }),
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: after, name: "y" }) +
      SvgAttributes.getNumberFromMarkup({
        attributes: after,
        name: "height",
      }) <=
      SvgAttributes.getNumberFromMarkup({ attributes: socket, name: "y" }) +
        SvgAttributes.getNumberFromMarkup({
          attributes: socket,
          name: "height",
        }),
  );
}
