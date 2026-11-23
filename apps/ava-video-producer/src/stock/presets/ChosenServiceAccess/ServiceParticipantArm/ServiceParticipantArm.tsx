import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { AccessParticipantGetServiceParticipantPoseValue } from "../AccessParticipant";
import type { Input } from "../ChosenServiceAccess.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  accent: string;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  x: AccessParticipantGetServiceParticipantPoseValue["x"];
  choosing: AccessParticipantGetServiceParticipantPoseValue["choosing"];
  y: AccessParticipantGetServiceParticipantPoseValue["y"];
  handX: AccessParticipantGetServiceParticipantPoseValue["handX"];
  handY: AccessParticipantGetServiceParticipantPoseValue["handY"];
};
/** Shows the participant pointing or propelling at the entrance. */
export function ServiceParticipantArm({
  input,
  accent,
  tokens,
  scales,
  x,
  choosing,
  y,
  handX,
  handY,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${x} ${y - 41} L${x + (handX - x) * 0.5} ${handY + 6} L${handX} ${handY}`,
        }}
        profile={tokens.sketch.shape}
        data-participant-arm
        data-choice-point={choosing ? input.chosenServiceId : undefined}
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        strokeLinecap="round"
      />
      <circle data-participant-hand cx={handX} cy={handY} r={3} fill={accent} />
    </>
  );
}
