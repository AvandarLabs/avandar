import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { getConservativeWidthFromText } from "../../../../text/getConservativeWidthFromText";
import { type AssertLiteralCellsWrapWholeAttributesOptions } from "./QueryColumnCacheGrowthTestState";

/**
 * Asserts literal cells wrap at whole graphemes and retain exact line
 * concatenation inside their cell.
 */
export function assertLiteralCellsWrapWholeAttributes({
  attributes,
  body,
  index,
  expected,
}: Readonly<AssertLiteralCellsWrapWholeAttributesOptions>): void {
  const escape = (text: string) => {
    return text
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  };
  assert.ok(
    attributes.includes(`data-literal-value="${escape(expected[index])}"`),
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes, name: "font-size" }),
    12,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes, name: "y" }),
    439 + index * 17,
  );
  const rawSpans = [...body.matchAll(/<tspan[^>]*>([^<]*)<\/tspan>/g)]
    .map(([, text]) => {
      return text;
    })
    .join("");
  assert.ok(
    getConservativeWidthFromText({
      text: rawSpans.replace(
        /[\p{Nonspacing_Mark}\p{Enclosing_Mark}\p{Default_Ignorable_Code_Point}]/gu,
        "",
      ),
      fontSize: 12,
    }) <= 148,
  );
}
