import { LiteralSourceHelpers } from "./LiteralSourceHelpers";
import { type LiteralCountReporter } from "./ThemeLiteralCounter.types";
import type ts from "typescript";

const SVG_TEXT_TAGS = new Set(["text", "tspan"]);
/**
 * Reports literal text styling on graphic Text and native SVG text elements.
 */
export function reportTextLiteralsFromElement({
  tag,
  attributes,
  count: onLiteralCount,
}: Readonly<{
  tag: string;
  attributes: readonly ts.JsxAttribute[];
  count: LiteralCountReporter;
}>): void {
  attributes.forEach((attribute) => {
    const name = LiteralSourceHelpers.attributeName(attribute);
    const value = LiteralSourceHelpers.attributeValue(attribute);
    if (
      tag === "Text" &&
      name === "size" &&
      LiteralSourceHelpers.isNumericLiteral(value)
    ) {
      onLiteralCount("type");
    }
    if (SVG_TEXT_TAGS.has(tag)) {
      if (["fontSize", "fontWeight", "letterSpacing"].includes(name)) {
        onLiteralCount(
          "type",
          LiteralSourceHelpers.valueBranches(value).filter((branch) => {
            return (
              LiteralSourceHelpers.isNumericLiteral(branch) ||
              /^\d/.test(LiteralSourceHelpers.stringText(branch) ?? "")
            );
          }).length,
        );
      }
      if (
        name === "fontFamily" &&
        LiteralSourceHelpers.stringText(value) !== undefined
      ) {
        onLiteralCount("type");
      }
    }
  });
}
