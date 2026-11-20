import { ramp } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CleanupLaneHeading } from "./CleanupLaneHeading";
import {
  EXPLANATION_CUE,
  EXPLANATION_FRAMES,
  RAIL_CUE,
  RAIL_FRAMES,
} from "./cleanupTiming";
import type { Input } from "./CellNormalization.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/**
 * The right lane holds originals in a rail and edit explanations in ghost
 * mode.
 */
export function CleanupComparisonHeading({
  input,
  frame,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const inline = input.comparison === "inline-ghost";
  if (inline && !input.showEditLabels) {
    return undefined;
  }
  return (
    <CleanupLaneHeading
      text={inline ? input.columnLabels.change : input.columnLabels.original}
      labelRole={inline ? "change" : "original"}
      placement={inline ? "edit" : "retained"}
      x={514}
      y={122}
      opacity={
        inline
          ? ramp(
              frame,
              EXPLANATION_CUE,
              motion.scale(EXPLANATION_FRAMES),
              motion.reveal.easing,
            )
          : ramp(
              frame,
              RAIL_CUE,
              motion.scale(RAIL_FRAMES),
              motion.reveal.easing,
            )
      }
    />
  );
}
