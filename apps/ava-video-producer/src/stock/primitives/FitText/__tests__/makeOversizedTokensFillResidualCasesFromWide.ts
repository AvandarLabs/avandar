import { type WrappingCase } from "./FitTextWrappingTestState.types";
import { makeMixedResidualCasesFromGraphemes as _makeMixedResidualCasesFromGraphemes } from "./makeMixedResidualCasesFromGraphemes";
import { makeWideResidualCasesFromTextFactory as _makeWideResidualCasesFromTextFactory } from "./makeWideResidualCasesFromTextFactory";

/** Makes fresh authored fixture values for the test. */
/**
 * Makes fresh fixture state for oversized tokens fill residual line capacity
 * while fitting words and graphemes stay intact.
 */
export function makeOversizedTokensFillResidualCasesFromWide({
  wide,
  emoji,
  accent,
}: Readonly<{
  wide: (length: number) => string;
  emoji: string;
  accent: string;
}>): WrappingCase[] {
  return [
    ..._makeWideResidualCasesFromTextFactory(wide),
    ..._makeMixedResidualCasesFromGraphemes({ wide, emoji, accent }),
  ];
}
