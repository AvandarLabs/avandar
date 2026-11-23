import { Motion } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CellNormalizationShared } from "./CellNormalizationShared/CellNormalizationShared";
import { type Props as CellNormalizationSharedProps } from "./CellNormalizationShared/CellNormalizationShared.types";
import { RAIL_CUE, RAIL_FRAMES } from "./cleanupTiming";
import type { ReactNode } from "react";

type Props = Pick<CellNormalizationSharedProps, "frame" | "input" | "accent">;
/** The rail beside or across the rows that keeps the original values. */
export function OriginalValueRail({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const rail = Motion.ramp({
    frame,
    at: RAIL_CUE,
    dur: motion.scale(RAIL_FRAMES),
    easing: motion.reveal.easing,
  });
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
