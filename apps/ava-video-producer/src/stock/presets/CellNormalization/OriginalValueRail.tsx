import { ramp } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CellNormalizationShared } from "./CellNormalizationShared/CellNormalizationShared";
import { type Props } from "./CellNormalizationShared/CellNormalizationShared.types";
import { RAIL_CUE, RAIL_FRAMES } from "./cleanupTiming";
import type { ReactNode } from "react";
/** The rail beside or across the rows that keeps the original values. */
export function OriginalValueRail({
  frame,
  input,
  accent,
}: Readonly<Pick<Props, "frame" | "input" | "accent">>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const rail = ramp(
    frame,
    RAIL_CUE,
    motion.scale(RAIL_FRAMES),
    motion.reveal.easing,
  );
  return (
    <g data-original-rail={input.comparison} opacity={rail}>
      <SketchedShape
        shape={{
          kind: "path",
          d: input.comparison === "side-rail" ? "M496 132V584" : "M64 132H896",
        }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.hairline)}
        pathLength={CellNormalizationShared.RAIL_LENGTH}
        strokeDasharray={CellNormalizationShared.RAIL_LENGTH}
        strokeDashoffset={CellNormalizationShared.RAIL_LENGTH * (1 - rail)}
      />
    </g>
  );
}
