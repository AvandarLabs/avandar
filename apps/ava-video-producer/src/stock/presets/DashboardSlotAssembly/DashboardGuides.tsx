import { ramp } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./DashboardSlotAssembly.schema";
import type { ReactNode } from "react";

type Props = { layout: Input["layout"]; frame: number; accent: string };

/** Frames the alignment guide takes to extend across the board. */
const EXTEND_FRAMES = 16;
/** The dash of the temporary alignment guide. */
const GUIDE_DASH = "5 7";
/** Alignment extends from the featured slot, then withdraws after docking. */
export function DashboardGuides({
  layout,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const progress = ramp(
    frame,
    48,
    motion.scale(EXTEND_FRAMES),
    motion.reveal.easing,
  );
  const guide =
    layout === "feature-left"
      ? { x1: 426, x2: 426, y1: 132, y2: 132 + 444 * progress }
      : { x1: 24, x2: 24 + 912 * progress, y1: 336, y2: 336 };
  const opacity =
    motion.reveal(frame, 48) *
    (1 - ramp(frame, 112, motion.hero, motion.exit.easing));
  return (
    <g data-alignment-guides="temporary" opacity={opacity}>
      <SketchedShape
        shape={{ kind: "line", ...guide }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.hairline)}
        strokeDasharray={GUIDE_DASH}
      />
    </g>
  );
}
