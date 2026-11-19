import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./TermLimitedRevenueShare.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  portion: number;
  amount: number;
  reveal: number;
  color: string;
};
/** Exact optional monetary labels retain the common minor-unit convention. */
export function RevenueAmount({
  input,
  portion,
  amount,
  reveal,
  color,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <g data-amount={portion} opacity={reveal}>
      <circle cx={8 + portion * 115} cy={105} r={4} fill={color} />
      <text
        x={18 + portion * 115}
        y={110}
        fill={tokens.color.text}
        fontFamily={tokens.text.graphic.data.fontFamily}
        fontSize={tokens.text.graphic.data.fontSize}
      >
        {(amount / input.money.minorUnitsPerUnit).toFixed(
          input.money.minorUnitsPerUnit === 100 ? 2 : 0,
        )}
      </text>
    </g>
  );
}
