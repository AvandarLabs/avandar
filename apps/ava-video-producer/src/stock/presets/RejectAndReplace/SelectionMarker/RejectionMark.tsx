import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { type Props } from "./SelectionMarkerShared.types";
import type { ReactNode } from "react";
/** A cross or a single strike through a rejected marker. */
export function RejectionMark({
  frame,
  rejectionMark,
}: Readonly<Pick<Props, "frame" | "rejectionMark">>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
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
