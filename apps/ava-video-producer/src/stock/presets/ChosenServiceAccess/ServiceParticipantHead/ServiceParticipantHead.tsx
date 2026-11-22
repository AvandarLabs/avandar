import { SketchedShape } from "../../../primitives/SketchedShape";
import type { AccessParticipantGetServiceParticipantPoseValue } from "../AccessParticipant";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  accent: string;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  x: AccessParticipantGetServiceParticipantPoseValue["x"];
  y: AccessParticipantGetServiceParticipantPoseValue["y"];
};
/** Draws the participant head at its current floor position. */
export function ServiceParticipantHead({
  accent,
  tokens,
  scales,
  x,
  y,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <SketchedShape
        shape={{ kind: "circle", cx: x, cy: y - 55, r: 8 }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
    </>
  );
}
