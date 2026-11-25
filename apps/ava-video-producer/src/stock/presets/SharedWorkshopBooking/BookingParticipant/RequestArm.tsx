import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { type Point } from "./BookingParticipantShared.types";
import type { ReactNode } from "react";

type Props = {
  requestId: string;
  person: Point;
  hand: Point;
  accent: string;
};
/** The participant's arm, reaching from their body to their hand. */
export function RequestArm({
  requestId,
  person,
  hand,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g data-request-hand={requestId}>
      <SketchedShape
        shape={{
          kind: "line",
          x1: person.x,
          y1: person.y,
          x2: hand.x,
          y2: hand.y,
        }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
    </g>
  );
}
