import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
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
        <path
          data-reading-hand={learnerId}
          d={`M0 0 L${handX / 2} ${handY / 2} L${handX} ${handY}`}
          fill="none"
          stroke={accent}
          strokeWidth={2.5}
        />
      ) : undefined}
    </>
  );
}
