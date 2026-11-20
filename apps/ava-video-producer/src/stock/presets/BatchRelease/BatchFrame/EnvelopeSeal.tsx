import { ramp } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { BatchFrameShared } from "./BatchFrameShared/BatchFrameShared";
import { type Props } from "./BatchFrameShared/BatchFrameShared.types";
import type { ReactNode } from "react";
/** The envelope's lid, drawn closed over the seal frames before completion. */
export function EnvelopeSeal({
  batchId,
  x,
  y,
  width,
  frame,
  completeAt,
  accent,
}: Readonly<Omit<Props, "isComplete">>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const seal = motion.scale(BatchFrameShared.SEAL_FRAMES);
  return (
    <g data-envelope-seal={batchId}>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${x} ${y + 20} V${y} H${x + width} V${y + 20}`,
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
        strokeDasharray={width + 40}
        strokeDashoffset={
          (width + 40) *
          (1 - ramp(frame, completeAt - seal, seal, motion.reveal.easing))
        }
      />
    </g>
  );
}
