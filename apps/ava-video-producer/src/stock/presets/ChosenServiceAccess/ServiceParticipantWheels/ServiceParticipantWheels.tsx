import type { Motion } from "../../../../motion";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../ChosenServiceAccess.schema";
import type { getServiceWheelCenterYFromWheelGeometry } from "../getServiceWheelCenterYFromWheelGeometry";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  accent: string;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  x: ReturnType<typeof Motion.mix>;
  rearY: ReturnType<typeof getServiceWheelCenterYFromWheelGeometry>;
  frontY: ReturnType<typeof getServiceWheelCenterYFromWheelGeometry>;
  frame: number;
  travel: ReturnType<
    ReturnType<typeof GraphicThemeHooks.useGraphicMotion>["ramp"]
  >;
};

/** Renders the participant wheel with authored geometry. */
export function ServiceParticipantWheels({
  input,
  accent,
  scales,
  tokens,
  x,
  rearY,
  frontY,
  frame,
  travel,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {input.participantMobility === "wheelchair" ? (
        <g
          fill="none"
          stroke={accent}
          strokeWidth={scales.stroke(tokens.stroke.default)}
        >
          <circle data-participant-wheel="rear" cx={x - 6} cy={rearY} r={20} />
          <circle
            data-participant-wheel="front"
            cx={x + 27}
            cy={frontY}
            r={5}
          />
          <path
            d={`M${x - 6} ${rearY} L${x - 6 + Math.sin(frame * 0.1 * travel) * 15} ${rearY + Math.cos(frame * 0.1 * travel) * 15}`}
          />
        </g>
      ) : undefined}
    </>
  );
}
