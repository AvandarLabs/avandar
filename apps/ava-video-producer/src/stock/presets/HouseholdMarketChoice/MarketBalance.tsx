import { FitText } from "../../primitives/FitText/FitText";
import type { Input } from "./HouseholdMarketChoice.schema";
import type { ReactNode } from "react";

type Props = { input: Input; balance: number; accent: string };

/** The household keeps the exact unspent demo credits beside its label. */
export function MarketBalance({
  input,
  balance,
  accent,
}: Readonly<Props>): ReactNode {
  if (!input.showRemainingBalance) {
    return null;
  }
  return (
    <g data-balance={balance}>
      <FitText
        text={input.labels.remaining}
        x={40}
        y={521}
        width={190}
        fontSize={12}
        maxLines={3}
        normalizeWhitespace
        breakLongWords
      />
      <text
        data-retained-credits={balance}
        x={265}
        y={521}
        textAnchor="end"
        fill={accent}
        fontSize={16}
      >
        {balance}
      </text>
    </g>
  );
}
