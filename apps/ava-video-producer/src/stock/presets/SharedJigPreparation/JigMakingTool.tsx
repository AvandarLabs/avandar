import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./SharedJigPreparation.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  pattern: Input["guide"]["pattern"];
  accent: string;
};
/** The maker's free hand moves the cutting tool between the authored marks. */
export function JigMakingTool({
  frame,
  pattern,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const { x, y } = _getToolPoint(frame, pattern, motion);
  return (
    <g>
      <SketchedShape
        shape={{ kind: "path", d: `M80 440 L40 315 L${x} ${y - 30}` }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <SketchedShape
        shape={{ kind: "path", d: `M${x} ${y - 30} V${y}` }}
        profile={tokens.sketch.shape}
        data-making-tool="true"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.heavy)}
      />
      <circle
        data-making-hand="true"
        cx={x}
        cy={y - 30}
        r={5}
        fill={tokens.color.highlight}
      />
    </g>
  );
}

/** The tool stepping between two holes, or sliding along a corner mark. */
function _getToolPoint(
  frame: number,
  pattern: Props["pattern"],
  motion: VideoMotion,
) {
  const progress = motion.ramp(
    frame,
    20,
    motion.scale(28),
    motion.travel.easing,
  );
  return {
    x:
      pattern === "two-holes"
        ? mix(
            motion.ramp(frame, 32, motion.press.duration, motion.travel.easing),
            110,
            150,
          )
        : 80 + 22 * progress,
    y: pattern === "two-holes" ? 382 : 350 + 22 * progress,
  };
}
