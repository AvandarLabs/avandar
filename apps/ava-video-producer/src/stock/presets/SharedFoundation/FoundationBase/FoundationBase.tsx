import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { FoundationCopy } from "../FoundationCopy";
import { FoundationSlabs } from "../FoundationSlabs";
import { FoundationSupports } from "../FoundationSupports";
import { FoundationGroundLine } from "./FoundationGroundLine";
import type { Props } from "../SharedFoundation";
import type { ReactNode } from "react";
/** Two revealed pieces join, or one continuous base is uncovered intact. */
export function FoundationBase({
  frame,
  accent,
  input,
  id,
  ...remainingProps
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
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
