import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = { frame: number; accent: string };
/** Speaking and interpreting hands pause between the authored turns. */
export function DialogueGestures({
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const first =
    motion.ramp(frame, 24, motion.chip) *
    (1 - motion.ramp(frame, 64, motion.chip));
  const second =
    motion.ramp(frame, 80, motion.chip) *
    (1 - motion.ramp(frame, 120, motion.chip));
  return (
    <g>
      {" "}
      <SketchedShape
        shape={{ kind: "path", d: `M210 485 L250 ${490 - first * 20}` }}
        profile={tokens.sketch.shape}
        data-speaking-gesture="participant"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <SketchedShape
        shape={{ kind: "path", d: `M750 485 L710 ${490 - second * 20}` }}
        profile={tokens.sketch.shape}
        data-speaking-gesture="worker"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M480 510 L450 ${510 - (first + second) * 14} M480 510 L510 ${510 - (first + second) * 14}`,
        }}
        profile={tokens.sketch.shape}
        data-interpreter-gesture=""
        stroke={tokens.color.accentAlt}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
    </g>
  );
}
