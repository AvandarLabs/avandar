import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { STOCK } from "../../stockPalette";
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
  return (
    <g>
      {" "}
      <rect
        data-observed-slot={item.id}
        x={510}
        y={y + 22}
        width={390}
        height={35}
        fill={STOCK.surface}
        stroke={STOCK.muted}
        strokeDasharray={item.observed === null ? "5 5" : undefined}
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
