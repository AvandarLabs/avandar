import assert from "node:assert/strict";
import { assertExchangeCardsRetainCompleteRow as _assertExchangeCardsRetainCompleteRow } from "./assertExchangeCardsRetainCompleteRow";
import {
  _assertSeparate,
  _getTextLineBounds,
} from "./SchemaPlanLocalExecutionTestHelpers";
import type {
  _getCardBounds,
  render,
} from "./SchemaPlanLocalExecutionTestHelpers";

/**
 * Asserts exchange cards retain complete wrapped text and avoid other cards,
 * captions and raw rows.
 */
export function assertExchangeCardsRetainCompleteCard({
  card,
  frame,
  markup,
}: Readonly<{
  card: ReturnType<typeof _getCardBounds>;
  frame: number;
  markup: ReturnType<typeof render>;
}>): void {
  const lines = _getTextLineBounds({
    markup: card.markup,
    x: card.left,
    y: card.top,
  });
  assert.ok(lines.length);
  lines.forEach((line) => {
    return assert.ok(
      line.left >= card.left &&
        line.right <= card.right &&
        line.top >= card.top &&
        line.bottom <= card.bottom,
      `frame ${frame}: complete card text ${JSON.stringify(line)}`,
    );
  });
  const tableStart = markup.indexOf('data-local-table="true"');
  _getTextLineBounds({ markup: markup.slice(0, tableStart) }).forEach(
    (caption) => {
      return _assertSeparate({
        first: card,
        second: caption,
        context: `frame ${frame}: card/caption`,
      });
    },
  );
  [...markup.matchAll(/<rect[^>]*data-row-body="[^"]*"[^>]*>/g)].forEach(
    ([row]) => {
      return _assertExchangeCardsRetainCompleteRow({ row, card, frame });
    },
  );
}
