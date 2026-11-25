import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { DimensionTicks } from "./DimensionTicks";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./ParcelSetbackInset.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * The whole authored footprint lowers without rotation or automatic resizing.
 */
export function StructureFootprint({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const { x, y, width, height } = _getFootprintBox({ input, frame, motion });
  return (
    <g opacity={motion.ramp(frame, 78, motion.chip, motion.reveal.easing)}>
      <StockRect
        data-structure-footprint=""
        x={x}
        y={y}
        width={width}
        height={height}
        fill={accent}
        fillOpacity={scales.wash(atomic.opacity["32"])}
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
/** The footprint's box, lowering into its authored place. */
function _getFootprintBox({
  input,
  frame,
  motion,
}: Readonly<{ input: Input; frame: number; motion: VideoMotion }>) {
  const placement = motion.ramp(
    frame,
    84,
    motion.scale(24),
    motion.travel.easing,
  );
  return {
    x: 70 + (input.placement.centerX - input.structure.width / 2) * 4.8,
    y:
      160 +
      (input.placement.centerY - input.structure.height / 2) * 2.8 -
      32 * (1 - placement),
    width: input.structure.width * 4.8,
    height: input.structure.height * 2.8,
  };
}
