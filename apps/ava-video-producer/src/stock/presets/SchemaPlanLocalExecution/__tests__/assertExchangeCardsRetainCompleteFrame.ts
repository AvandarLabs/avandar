import { DEFAULT_INPUT } from "../SchemaPlanLocalExecution.fixtures";
import { assertExchangeCardsRetainCompleteCard as _assertExchangeCardsRetainCompleteCard } from "./assertExchangeCardsRetainCompleteCard";
import {
  render,
  _getCardBounds,
  _assertSeparate,
} from "./SchemaPlanLocalExecutionTestHelpers";

/**
 * Asserts exchange cards retain complete wrapped text and avoid other cards,
 * captions and raw rows.
 */
export function assertExchangeCardsRetainCompleteFrame({
  frame,
  input,
}: Readonly<{
  frame: number[][number];
  input: Readonly<typeof DEFAULT_INPUT>;
}>): void {
  const markup = render({ frame: frame, input: input }),
    inbound = _getCardBounds({ markup, kind: "inbound" }),
    outbound = _getCardBounds({ markup, kind: "outbound" });
  _assertSeparate({
    first: inbound,
    second: outbound,
    context: `frame ${frame}: exchange cards`,
  });
  [inbound, outbound].forEach((card) => {
    return _assertExchangeCardsRetainCompleteCard({ card, frame, markup });
  });
}
