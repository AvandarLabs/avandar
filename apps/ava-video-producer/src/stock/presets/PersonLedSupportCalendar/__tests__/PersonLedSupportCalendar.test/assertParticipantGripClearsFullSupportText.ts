import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";

/**
 * Asserts the participant grip clears the full proposal caption and agreed
 * booking label.
 */
export function assertParticipantGripClearsFullSupportText({
  supportText,
  box,
}: Readonly<{ supportText: RegExpMatchArray[number]; box: string }>): void {
  const offsets = [...supportText.matchAll(/ dy="([^"]+)"/g)].reduce(
    (sum, match) => {
      return sum + Number(match[1]);
    },
    0,
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: supportText, name: "y" }) +
      offsets +
      3 <=
      SvgAttributes.getNumberFromMarkup({ attributes: box, name: "y" }) +
        SvgAttributes.getNumberFromMarkup({ attributes: box, name: "height" }),
  );
}
