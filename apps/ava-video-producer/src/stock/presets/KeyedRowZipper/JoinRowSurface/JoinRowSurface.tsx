import { StockRect } from "../../../primitives/StockRect";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getJoinRowLayoutFromInputAndFrame } from "../getJoinRowLayoutFromInputAndFrame";
import type { Input } from "../KeyedRowZipper.schema";
import type { ReactNode } from "react";

type Props = {
  side: "left" | "right";
  isContext: ReturnType<typeof getJoinRowLayoutFromInputAndFrame>["isContext"];
  row: Input["leftRows"][number];
  x: ReturnType<typeof getJoinRowLayoutFromInputAndFrame>["x"];
  y: ReturnType<typeof getJoinRowLayoutFromInputAndFrame>["y"];
  height: ReturnType<typeof getJoinRowLayoutFromInputAndFrame>["height"];
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  accent: string;
};

/** Renders the side with authored geometry. */
export function JoinRowSurface({
  side,
  isContext,
  row,
  x,
  y,
  height,
  scales,
  tokens,
  accent,
}: Readonly<Props>): ReactNode {
  return (
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
  );
}
