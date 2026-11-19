import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = { label: string; checkpoint: number; frame: number };
/** A complete bounded caption connects to the exact acknowledged byte. */
export function RetryCheckpoint({
  label,
  checkpoint,
  frame,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const captionX = Math.max(84, Math.min(516, checkpoint - 180));
  return (
    <g opacity={motion.ramp(frame, 56, motion.scale(10))}>
      <SketchedShape
        shape={{ kind: "path", d: `M${checkpoint} 145 V444` }}
        profile={tokens.sketch.shape}
        data-checkpoint-line="true"
        stroke={tokens.color.highlight}
        strokeDasharray="4 6"
      />
      <LabelSlots labels={[[label, captionX, 90, 360, 16, 3]]} />
      <SketchedShape
        shape={{ kind: "path", d: `M${captionX} 142 H${checkpoint} V151` }}
        profile={tokens.sketch.shape}
        data-retry-caption-link="true"
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(tokens.stroke.outline)}
        fill="none"
      />
      <circle cx={checkpoint} cy={151} r={2} fill={tokens.color.highlight} />
    </g>
  );
}
