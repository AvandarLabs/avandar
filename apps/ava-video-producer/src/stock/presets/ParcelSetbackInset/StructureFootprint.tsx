import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { DimensionTicks } from "./DimensionTicks";
import type { Input } from "./ParcelSetbackInset.schema";
import type { ReactNode } from "react";

/** The structure footprint's tint, before the theme's tint strength. */
const FOOTPRINT_TINT = 0.32;
type Props = { input: Input; frame: number; accent: string };
/**
 * The whole authored footprint lowers without rotation or automatic resizing.
 */
export function StructureFootprint({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const placement = motion.ramp(
    frame,
    84,
    motion.scale(24),
    motion.travel.easing,
  );
  const x = 70 + (input.placement.centerX - input.structure.width / 2) * 4.8;
  const y =
    160 +
    (input.placement.centerY - input.structure.height / 2) * 2.8 -
    32 * (1 - placement);
  const width = input.structure.width * 4.8;
  const height = input.structure.height * 2.8;
  return (
    <g opacity={motion.ramp(frame, 78, motion.chip, motion.reveal.easing)}>
      <StockRect
        data-structure-footprint=""
        x={x}
        y={y}
        width={width}
        height={height}
        fill={accent}
        fillOpacity={scales.wash(FOOTPRINT_TINT)}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      {input.showDimensions ? (
        <DimensionTicks
          x={x}
          y={y}
          width={width}
          height={height}
          marker="structure"
          side="inside"
        />
      ) : undefined}
    </g>
  );
}
