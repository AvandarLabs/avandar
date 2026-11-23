import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { getConservativeWidthFromText } from "../../../../text/getConservativeWidthFromText";
import { type Input } from "../../ResumableByteTransfer.schema";

/**
 * Makes fresh fixture state for the full retry caption identifies every
 * exact checkpoint with offsets shown or hidden.
 */
export function makeFullRetryCaptionIdentifiesCaptionFromCaption({
  caption,
  input,
}: Readonly<{
  caption: string;
  input: Readonly<Input>;
}>): { x: number; fontSize: number; right: number } {
  const x = SvgAttributes.getNumberFromMarkup({
      attributes: caption,
      name: "x",
    }),
    fontSize = SvgAttributes.getNumberFromMarkup({
      attributes: caption,
      name: "font-size",
    });
  const right =
    x + getConservativeWidthFromText({ text: input.labels.retry, fontSize });
  return { x, fontSize, right };
}
