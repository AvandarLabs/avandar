import { type WrappingCase } from "./FitTextWrappingTestState.types";

/**
 * Makes fresh fixture state for wide tokens retain exact residual-line
 * expectations.
 */
export function makeWideResidualCasesFromTextFactory(
  wide: (length: number) => string,
): WrappingCase[] {
  return [
    {
      text: `${wide(1)} ${wide(4)}`,
      width: 60,
      lines: [`${wide(1)} ${wide(2)}`, wide(2)],
    },
    {
      text: `${wide(2)} ${wide(4)}`,
      width: 60,
      lines: [`${wide(2)} ${wide(1)}`, wide(3)],
    },
    {
      text: `${wide(3)} ${wide(4)}`,
      width: 60,
      lines: [wide(3), wide(3), wide(1)],
    },
    {
      text: `${wide(1)} ${wide(7)}`,
      width: 60,
      lines: [`${wide(1)} ${wide(2)}`, wide(3), wide(2)],
    },
  ];
}
