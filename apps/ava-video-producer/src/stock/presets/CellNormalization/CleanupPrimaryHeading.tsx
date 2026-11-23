import { Motion } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CleanupLaneHeading } from "./CleanupLaneHeading";
import type { Input } from "./CellNormalization.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  accent: string;
};
/** Frames the lane heading takes to turn from original to result. */
const REFINE_FRAMES = 72;
/**
 * The main lane is original at setup and prepared once replacement resolves.
 */
export function CleanupPrimaryHeading({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const refinement = Motion.ramp({
    frame,
    at: 40,
    dur: motion.scale(REFINE_FRAMES),
    easing: motion.travel.easing,
  });
  const bounds = { x: 88, y: 122, placement: "primary" as const };
  return (
    <g>
      <CleanupLaneHeading
        {...bounds}
        text={input.columnLabels.original}
        labelRole="original"
        opacity={1 - refinement}
      />
      <CleanupLaneHeading
        {...bounds}
        text={input.columnLabels.result}
        labelRole="result"
        opacity={refinement}
        color={accent}
      />
    </g>
  );
}
