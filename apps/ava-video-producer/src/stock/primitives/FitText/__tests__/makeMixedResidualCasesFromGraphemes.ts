import { type WrappingCase } from "./FitTextWrappingTestState.types";

/**
 * Makes fresh fixture state for mixed tokens retain exact residual-line
 * expectations.
 */
export function makeMixedResidualCasesFromGraphemes({
  wide,
  emoji,
  accent,
}: Readonly<{
  wide: (length: number) => string;
  emoji: string;
  accent: string;
}>): WrappingCase[] {
  return [
    {
      text: `${wide(1)} ${wide(4)} ok`,
      width: 60,
      lines: [`${wide(1)} ${wide(2)}`, `${wide(2)} ok`],
    },
    {
      text: `ok ${wide(4)} ${wide(1)}`,
      width: 60,
      lines: [`ok ${wide(2)}`, `${wide(2)} ${wide(1)}`],
    },
    {
      text: `${wide(1)} ${wide(4)} word`,
      width: 60,
      lines: [`${wide(1)} ${wide(2)}`, wide(2), "word"],
    },
    {
      text: `${wide(1)} ${emoji.repeat(3)}`,
      width: 80,
      lines: [`${wide(1)} ${emoji}`, emoji.repeat(2)],
    },
    {
      text: `${wide(1)} ${accent.repeat(8)}`,
      width: 60,
      lines: [`${wide(1)} ${accent.repeat(3)}`, accent.repeat(5)],
    },
  ];
}
