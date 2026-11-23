import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { RejectionMark } from "./RejectionMark";
import { type Props } from "./SelectionMarkerShared.types";
import type { ReactNode } from "react";
/**
 * Rejection strikes only the selection marker. Rationale text remains
 * untouched.
 */
export function SelectionMarker({
  frame,
  accent,
  isReplacement,
  rejectionMark,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <SketchedShape
        shape={{ kind: "circle", cx: 0, cy: 286, r: 9 }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={isReplacement ? accent : tokens.color.inactive}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      {isReplacement ? (
        <SketchedShape
          shape={{ kind: "path", d: "M-22 274 h-8 v25 h8 M22 274 h8 v25 h-8" }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.default)}
          opacity={motion.reveal(frame, 108)}
        />
      ) : (
        <RejectionMark frame={frame} rejectionMark={rejectionMark} />
      )}
    </g>
  );
}
