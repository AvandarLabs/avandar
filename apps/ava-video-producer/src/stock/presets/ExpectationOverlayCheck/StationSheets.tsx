import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import { ExpectedSheet } from "./ExpectedSheet";
import type { Input } from "./ExpectationOverlayCheck.schema";
import type { ReactNode } from "react";

type Props = {
  item: Input["tests"][number];
  y: number;
  frame: number;
  input: Input;
  state: string;
  accent: string;
};
/**
 * Aligned sheets preserve complete literal values and an empty missing slot.
 */
export function StationSheets({
  item,
  y,
  frame,
  input,
  state,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <g>
      {" "}
      <StockRect
        data-observed-slot={item.id}
        x={510}
        y={y + 22}
        width={390}
        height={35}
        fill={tokens.color.surface}
        stroke={tokens.color.inactive}
        strokeDasharray={
          item.observed === null ? tokens.dash.placeholder.join(" ") : undefined
        }
      />
      {item.observed !== null ? (
        <LiteralDataText value={item.observed} x={525} y={y + 44} />
      ) : undefined}
      <ExpectedSheet
        frame={frame}
        y={y}
        input={input}
        item={item}
        state={state}
        accent={accent}
      />
    </g>
  );
}
