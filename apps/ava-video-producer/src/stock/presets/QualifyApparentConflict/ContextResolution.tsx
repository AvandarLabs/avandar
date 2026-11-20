import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ContextQualifier } from "./ContextQualifier";
import { ContextQuestion } from "./ContextQuestion";
import type { Props } from "./QualifyApparentConflict";
import type { ReactNode } from "react";
/**
 * A divider establishes separate contexts before their joining qualification.
 */
export function ContextResolution({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const split = motion.ramp(frame, 48, motion.scale(36));
  const resolution = motion.ramp(frame, 96, motion.scale(24));
  const dividerOpacity =
    split * (input.showCentralDivider ? 1 : 1 - motion.reveal(frame, 108));
  return (
    <g>
      <ContextQuestion {...{ frame, input, accent, id: "question" }} />
      <SketchedShape
        shape={{
          kind: "line",
          x1: 480,
          y1: mix(split, 270, 130),
          x2: 480,
          y2: mix(split, 270, 410),
        }}
        profile={tokens.sketch.shape}
        data-context-divider="true"
        stroke={tokens.color.line}
        strokeWidth={scales.stroke(tokens.stroke.default)}
        opacity={dividerOpacity}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: "M250 408 V420 H466 Q480 420 480 434 Q480 420 494 420 H710 V408",
        }}
        profile={tokens.sketch.shape}
        data-joining-brace="true"
        opacity={resolution}
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <ContextQualifier {...{ frame, input, accent, id: "qualifier" }} />
    </g>
  );
}
