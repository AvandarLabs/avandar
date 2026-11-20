import { mix, ramp } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./DocumentRegionDriftCheck.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  accent: string;
  side: "saved" | "current";
};
/** Frames the current page takes to settle over the saved one. */
const SETTLE_FRAMES = 37;
/** Page outlines retain the exact normalized region without label clamping. */
export function RegionPage({
  input,
  frame,
  accent,
  side,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const progress = ramp(
      frame,
      13,
      motion.scale(SETTLE_FRAMES),
      motion.travel.easing,
    ),
    x = side === "saved" ? 52 : mix(progress, 608, 508),
    y = side === "saved" ? 180 : mix(progress, 196, 180);
  const [left, top, right, bottom] = input.saved.box;
  return (
    <g>
      <StockRect
        data-page-outline={side}
        x={x}
        y={y}
        width={300}
        height={200}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
      />
      {[0, 1, 2, 3].map((index) => {
        return (
          <SketchedShape
            key={index}
            shape={{
              kind: "path",
              d: `M${x + 18} ${y + 26 + index * 34} h264`,
            }}
            profile={tokens.sketch.shape}
            stroke={tokens.color.line}
            strokeOpacity={tokens.alpha.dimmed}
          />
        );
      })}
      <StockRect
        data-saved-region={side}
        data-page={input.saved.page}
        x={x + left * 3}
        y={y + top * 2}
        width={(right - left) * 3}
        height={(bottom - top) * 2}
        fill={accent}
        fillOpacity={scales.wash(tokens.alpha.wash)}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.outline)}
      />
    </g>
  );
}
