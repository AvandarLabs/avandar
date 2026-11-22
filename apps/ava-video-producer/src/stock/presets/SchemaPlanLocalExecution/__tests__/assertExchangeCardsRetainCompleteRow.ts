import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import type {
  _getCardBounds} from "./SchemaPlanLocalExecutionTestHelpers";
import {
  _assertSeparate,
} from "./SchemaPlanLocalExecutionTestHelpers";

/**
 * Asserts exchange cards retain complete wrapped text and avoid other cards,
 * captions and raw rows.
 */
export function assertExchangeCardsRetainCompleteRow({
  row,
  card,
  frame,
}: Readonly<{
  row: RegExpExecArray[0];
  card: ReturnType<typeof _getCardBounds>;
  frame: number;
}>): void {
  const left = SvgAttributes.getNumberFromMarkup({
      attributes: row,
      name: "x",
    }),
    top = SvgAttributes.getNumberFromMarkup({ attributes: row, name: "y" });
  _assertSeparate({
    first: card,
    second: {
      left,
      top,
      right:
        left +
        SvgAttributes.getNumberFromMarkup({ attributes: row, name: "width" }),
      bottom:
        top +
        SvgAttributes.getNumberFromMarkup({ attributes: row, name: "height" }),
    },
    context: `frame ${frame}: retained row`,
  });
}
