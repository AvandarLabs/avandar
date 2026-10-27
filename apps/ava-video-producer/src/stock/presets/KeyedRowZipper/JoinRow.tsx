import { propEq } from "@avandar/utils";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { STOCK } from "../../stockPalette";
import { getJoinRowLayoutFromInputAndFrame } from "./getJoinRowLayoutFromInputAndFrame";
import { JoinKeyCell } from "./JoinKeyCell";
import { JoinMissingPartner } from "./JoinMissingPartner";
import type { Input } from "./KeyedRowZipper.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  accent: string;
  side: "left" | "right";
  row: Input["leftRows"][number];
  index: number;
};
/**
 * One source row retains its original data while joining or entering context.
 */
export function JoinRow({
  input,
  frame,
  accent,
  side,
  row,
  index,
}: Readonly<Props>): ReactNode {
  const { x, y, height, isContext, progress } =
    getJoinRowLayoutFromInputAndFrame({
      input,
      frame,
      side,
      row,
      index,
    });
  const hasPartner = input.rightRows.some(propEq("key", row.key));
  if (isContext && !input.showUnmatchedTray && progress === 1) {
    return undefined;
  }
  return (
    <g opacity={isContext && !input.showUnmatchedTray ? 1 - progress : 1}>
      <StockRect
        data-side={side}
        data-result-key={side === "left" && !isContext ? row.key : undefined}
        data-context-key={isContext ? row.key : undefined}
        x={x}
        y={y}
        width={416}
        height={height}
        rx={4}
        fill={STOCK.surface}
        stroke={isContext ? STOCK.line : accent}
      />
      {input.showKeys || progress < 1 ? (
        <JoinKeyCell value={row.key} x={x} y={y} side={side} accent={accent} />
      ) : undefined}
      <LiteralDataText
        value={row.value}
        x={x + 12}
        y={y + (isContext ? 33 : 43)}
      />
      {side === "left" && !isContext && !hasPartner && progress > 0 ? (
        <JoinMissingPartner
          rowKey={row.key}
          y={y}
          label={input.labels.missing}
          progress={progress}
        />
      ) : undefined}
    </g>
  );
}
