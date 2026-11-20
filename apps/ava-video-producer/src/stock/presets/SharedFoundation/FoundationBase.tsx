import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { FoundationCopy } from "./FoundationCopy";
import { FoundationSlabs } from "./FoundationSlabs";
import { FoundationSupports } from "./FoundationSupports";
import type { Props } from "./SharedFoundation";
import type { ReactNode } from "react";
/** Two revealed pieces join, or one continuous base is uncovered intact. */
export function FoundationBase({
  frame,
  accent,
  input,
  id,
  ...remainingProps
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  const joining = motion.ramp(
    frame,
    72,
    motion.scale(36),
    motion.travel.easing,
  );
  const reveal = motion.ramp(frame, 48, motion.scale(24));
  const clipId = `${id}-foundation-reveal`;
  return (
    <g>
      <FoundationSupports
        {...{ ...remainingProps, frame, accent, input, id }}
      />
      <defs>
        <clipPath id={clipId}>
          <FoundationSlabs
            frame={frame}
            variant={input.foundationReveal}
            isMask
          />
        </clipPath>
      </defs>
      <g opacity={reveal}>
        <FoundationSlabs
          frame={frame}
          variant={input.foundationReveal}
          isMask={false}
        />
        <g clipPath={`url(#${clipId})`}>
          <FoundationCopy input={input} />
        </g>
        <FoundationGroundLine joining={joining} accent={accent} />
      </g>
    </g>
  );
}

/** The ground line the pieces join along. */
function FoundationGroundLine({
  joining,
  accent,
}: Readonly<{ joining: number; accent: string }>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <SketchedShape
      shape={{ kind: "path", d: "M80 550 H880" }}
      profile={tokens.sketch.shape}
      stroke={accent}
      strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      opacity={joining}
    />
  );
}
