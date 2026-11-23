import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";

/** Asserts maximum packed headings clear subsequent measurement text. */
export function assertMaximumPackedHeadingsClearTexts({
  texts,
  heading,
  label,
}: Readonly<{
  texts: Readonly<RegExpExecArray[]>;
  heading: NonNullable<RegExpExecArray[][number]>[number];
  label: NonNullable<RegExpExecArray[][number]>[number];
}>): void {
  const numeric = texts.find((match) => {
    return match[1] === "4";
  })![0];
  const bottom = (text: string) => {
    return (
      SvgAttributes.getNumberFromMarkup({ attributes: text, name: "y" }) +
      [...text.matchAll(/ dy="([^"]*)"/g)].reduce((sum, match) => {
        return sum + Number(match[1]);
      }, 0) +
      SvgAttributes.getNumberFromMarkup({
        attributes: text,
        name: "font-size",
      }) *
        0.3
    );
  };
  assert.ok(
    bottom(heading) <
      SvgAttributes.getNumberFromMarkup({ attributes: label, name: "y" }) - 16,
  );
  assert.ok(
    bottom(label) <
      SvgAttributes.getNumberFromMarkup({ attributes: numeric, name: "y" }) -
        20,
  );
}
