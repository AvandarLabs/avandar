import { propEq } from "@avandar/utils";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getJoinRowLayoutFromInputAndFrame } from "./getJoinRowLayoutFromInputAndFrame";
import { getJoinRowVisibility } from "./getJoinRowVisibility";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { x, y, height, isContext, progress } =
    getJoinRowLayoutFromInputAndFrame({
      input,
      frame,
      side,
      row,
      index,
      motion,
    });
  const hasPartner = input.rightRows.some(propEq("key", row.key));
  const visibility = getJoinRowVisibility({
    input,
    side,
    isContext,
    progress,
    hasPartner,
  });
  if (visibility.isHidden) {
    return undefined;
  }
  return (
    <g opacity={visibility.opacity}>
      <StockRect
        data-side={side}
        data-result-key={side === "left" && !isContext ? row.key : undefined}
        data-context-key={isContext ? row.key : undefined}
        x={x}
        y={y}
        width={416}
        height={height}
        rx={scales.corner(tokens.corner.chip)}
        fill={tokens.color.surface}
        stroke={isContext ? tokens.color.line : accent}
      />
      {visibility.showKey ? (
        <JoinKeyCell value={row.key} x={x} y={y} side={side} accent={accent} />
      ) : undefined}
      <LiteralDataText
        value={row.value}
        x={x + 12}
        y={y + (isContext ? 33 : 43)}
      />
      {visibility.showMissingPartner ? (
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
