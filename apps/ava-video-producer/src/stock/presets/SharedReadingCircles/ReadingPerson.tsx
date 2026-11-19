import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = {
  learnerId: string;
  accent: string;
  isCarrying: boolean;
  hasHand: boolean;
  handX: number;
  handY: number;
};
/** Extends the carrier's arm to the actual edge of its conserved book. */
export function ReadingPerson({
  learnerId,
  accent,
  isCarrying,
  hasHand,
  handX,
  handY,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <>
      <PersonGlyph
        x={0}
        y={0}
        size={40}
        posture={isCarrying ? "walking" : "seated"}
        color={accent}
      />
      {hasHand ? (
        <g data-reading-hand={learnerId}>
          <SketchedShape
            shape={{
              kind: "path",
              d: `M0 0 L${handX / 2} ${handY / 2} L${handX} ${handY}`,
            }}
            profile={tokens.sketch.shape}
            fill="none"
            stroke={accent}
            strokeWidth={scales.stroke(2.5)}
          />
        </g>
      ) : undefined}
    </>
  );
}
