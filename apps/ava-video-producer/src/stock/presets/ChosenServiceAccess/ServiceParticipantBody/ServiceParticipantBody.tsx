import { SketchedShape } from "../../../primitives/SketchedShape";
import type { Motion } from "../../../../motion";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../ChosenServiceAccess.schema";
import type { getServiceFloorYFromX } from "../getServiceFloorYFromX";
import type { getServiceWheelCenterYFromWheelGeometry } from "../getServiceWheelCenterYFromWheelGeometry";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  x: ReturnType<typeof Motion.mix>;
  y: number | ReturnType<typeof getServiceFloorYFromX>;
  frontY: ReturnType<typeof getServiceWheelCenterYFromWheelGeometry>;
  leftFootX: number;
  leftFootY: ReturnType<typeof getServiceFloorYFromX>;
  rightFootX: number;
  rightFootY: ReturnType<typeof getServiceFloorYFromX>;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  accent: string;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};

/** Renders the participant body with authored geometry. */
export function ServiceParticipantBody({
  input,
  x,
  y,
  frontY,
  leftFootX,
  leftFootY,
  rightFootX,
  rightFootY,
  tokens,
  accent,
  scales,
}: Readonly<Props>): ReactNode {
  return (
    <SketchedShape
      shape={{
        kind: "path",
        d:
          input.participantMobility === "wheelchair"
            ? `M${x} ${y - 45} V${y - 22} H${x + 20} L${x + 26} ${frontY}`
            : `M${x} ${y - 45} V${y - 20} L${leftFootX} ${leftFootY} M${x} ${y - 20} L${rightFootX} ${rightFootY}`,
      }}
      profile={tokens.sketch.shape}
      data-participant-body
      fill="none"
      stroke={accent}
      strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      strokeLinecap="round"
    />
  );
}
