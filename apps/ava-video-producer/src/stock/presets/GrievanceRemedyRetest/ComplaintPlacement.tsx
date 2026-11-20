import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./GrievanceRemedyRetest.schema";
import type { ReactNode } from "react";
/** Inputs for ComplaintPlacement. */
type Props = { frame: number; input: Input; accent: string };
/** The participant places an optional persistent complaint marker. */
export function ComplaintPlacement({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const complaint = motion.ramp(frame, 32, motion.scale(10));
  return (
    <g>
      {" "}
      {input.showComplaintMarker && frame >= 32 ? (
        <g>
          <SketchedShape
            shape={{
              kind: "circle",
              cx: mix(complaint, 220, 320),
              cy: mix(complaint, 325, 415),
              r: 14,
            }}
            profile={tokens.sketch.shape}
            data-complaint-marker="retained"
            fill={tokens.color.surface}
            stroke={tokens.color.highlight}
            strokeWidth={scales.stroke(tokens.stroke.emphasis)}
          />
          {frame <= 42 ? (
            <SketchedShape
              shape={{
                kind: "path",
                d: `M200 310 L${mix(complaint, 220, 320)} ${mix(complaint, 325, 415)}`,
              }}
              profile={tokens.sketch.shape}
              data-complaint-hand="participant"
              fill="none"
              stroke={accent}
              strokeWidth={scales.stroke(tokens.stroke.heavy)}
            />
          ) : undefined}
        </g>
      ) : undefined}
    </g>
  );
}
