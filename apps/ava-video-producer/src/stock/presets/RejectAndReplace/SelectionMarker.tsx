import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./RejectAndReplace.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  accent: string;
  isReplacement: boolean;
  rejectionMark: Input["rejectionMark"];
};
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
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
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

/** A cross or a single strike through a rejected marker. */
function RejectionMark({
  frame,
  rejectionMark,
}: Readonly<Pick<Props, "frame" | "rejectionMark">>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const path =
    rejectionMark === "cross"
      ? "M-9 277 L9 295 M9 277 L-9 295"
      : "M-12 292 L12 280";
  return (
    <g data-rejection-mark={rejectionMark} opacity={motion.reveal(frame, 36)}>
      <SketchedShape
        shape={{ kind: "path", d: path }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
    </g>
  );
}
