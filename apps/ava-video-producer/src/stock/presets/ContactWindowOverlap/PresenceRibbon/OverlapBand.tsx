import { StockRect } from "../../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { type Props } from "./PresenceRibbonShared.types";
import type { ReactNode } from "react";
/** The part of a ribbon inside the investigation window. */
export function OverlapBand({
  record,
  index,
  frame,
  accent,
  y,
  start,
  end,
  axisEnd,
}: Readonly<
  Omit<Props, "input"> & {
    y: number;
    start: number;
    end: number;
    axisEnd: number;
  }
>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <StockRect
      data-overlap="true"
      data-overlap-person={record.id}
      x={280 + (630 * start) / axisEnd}
      y={y - 10}
      width={(630 * (end - start)) / axisEnd}
      height={20}
      rx={scales.corner(tokens.corner.chip)}
      fill="none"
      stroke={accent}
      strokeWidth={scales.stroke(tokens.stroke.default)}
      opacity={motion.ramp(
        frame,
        96 + index * motion.scaleStagger(2),
        motion.scale(10),
      )}
    />
  );
}
