import { type Input } from "../SchemaPlanLocalExecution.schema";
import { assertExchangeCardsRetainCompleteFrame as _assertExchangeCardsRetainCompleteFrame } from "./assertExchangeCardsRetainCompleteFrame";

/**
 * Asserts exchange cards retain complete wrapped text and avoid other cards,
 * captions and raw rows.
 */
export function assertExchangeCardsRetainCompleteInput(
  input: Readonly<Input>,
): void {
  Array.from(
    { length: Math.max(0, Math.floor((167 - 56) / 3) + 1) },
    (_, sampleIndex) => {
      return 56 + sampleIndex * 3;
    },
  ).forEach((frame) => {
    return _assertExchangeCardsRetainCompleteFrame({ frame, input });
  });
}
