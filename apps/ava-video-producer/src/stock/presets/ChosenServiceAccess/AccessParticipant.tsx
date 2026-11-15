import { propEq } from "@avandar/utils";
import { EASE, mix, ramp } from "../../../motion";
import { getServiceFloorYFromX } from "./getServiceFloorYFromX";
import { getServiceWheelCenterYFromWheelGeometry } from "./getServiceWheelCenterYFromWheelGeometry";
import type { Input } from "./ChosenServiceAccess.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * The participant points, then walks or self-propels through the chosen door.
 */
export function AccessParticipant({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const chosenIndex = input.services.findIndex(
    propEq("id", input.chosenServiceId),
  );
  const doorX = 160 + ((chosenIndex + 0.5) * 640) / input.services.length;
  const travel = ramp(frame, 78, 42, EASE.inOut);
  const approach = ramp(frame, 78, 20, EASE.inOut);
  const entry = ramp(frame, 98, 22, EASE.inOut);
  const x =
    frame < 98
      ? mix(approach, 60, doorX - 100)
      : mix(entry, doorX - 100, doorX);
  const choosing = frame >= 24 && frame < 44;
  const propulsion = Math.sin(Math.PI * travel) * Math.sin(frame * 0.7) * 8;
  const wheelAngle = -Math.PI / 2 + propulsion * 0.08;
  const rearY = getServiceWheelCenterYFromWheelGeometry({
    x: x - 6,
    radius: 21,
    doorX,
    accessChange: input.accessChange,
  });
  const y =
    input.participantMobility === "wheelchair"
      ? rearY + 17
      : getServiceFloorYFromX({ x, doorX, accessChange: input.accessChange });
  const frontY = getServiceWheelCenterYFromWheelGeometry({
    x: x + 27,
    radius: 6,
    doorX,
    accessChange: input.accessChange,
  });
  const leftFootX = x - 12 - propulsion,
    rightFootX = x + 12 + propulsion;
  const leftFootY = getServiceFloorYFromX({
    x: leftFootX,
    doorX,
    accessChange: input.accessChange,
  });
  const rightFootY = getServiceFloorYFromX({
    x: rightFootX,
    doorX,
    accessChange: input.accessChange,
  });
  const handX = choosing
    ? x + Math.sign(doorX - x) * 50
    : input.participantMobility === "wheelchair"
      ? x - 6 + Math.cos(wheelAngle) * 20
      : x + 12 + propulsion;
  const handY = choosing
    ? y - 70
    : input.participantMobility === "wheelchair"
      ? rearY + Math.sin(wheelAngle) * 20
      : y - 29;
  return (
    <g
      data-participant-position={travel === 1 ? "inside" : "outside"}
      data-x={x}
      data-y={y}
    >
      <circle
        cx={x}
        cy={y - 55}
        r={8}
        fill="none"
        stroke={accent}
        strokeWidth={3}
      />
      <path
        d={
          input.participantMobility === "wheelchair"
            ? `M${x} ${y - 45} V${y - 22} H${x + 20} L${x + 26} ${frontY}`
            : `M${x} ${y - 45} V${y - 20} L${leftFootX} ${leftFootY} M${x} ${y - 20} L${rightFootX} ${rightFootY}`
        }
        data-participant-body
        fill="none"
        stroke={accent}
        strokeWidth={3}
        strokeLinecap="round"
      />
      {input.participantMobility === "wheelchair" ? (
        <g fill="none" stroke={accent} strokeWidth={2}>
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
      <path
        data-participant-arm
        data-choice-point={choosing ? input.chosenServiceId : undefined}
        d={`M${x} ${y - 41} L${x + (handX - x) * 0.5} ${handY + 6} L${handX} ${handY}`}
        fill="none"
        stroke={accent}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <circle data-participant-hand cx={handX} cy={handY} r={3} fill={accent} />
    </g>
  );
}
