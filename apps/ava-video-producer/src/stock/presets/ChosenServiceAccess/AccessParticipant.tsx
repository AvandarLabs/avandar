import { propEq } from "@avandar/utils";
import { Motion } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getServiceFloorYFromX } from "./getServiceFloorYFromX";
import { getServiceWheelCenterYFromWheelGeometry } from "./getServiceWheelCenterYFromWheelGeometry";
import { ServiceParticipantArm } from "./ServiceParticipantArm/ServiceParticipantArm";
import { ServiceParticipantBody } from "./ServiceParticipantBody/ServiceParticipantBody";
import { ServiceParticipantHead } from "./ServiceParticipantHead/ServiceParticipantHead";
import { ServiceParticipantWheels } from "./ServiceParticipantWheels/ServiceParticipantWheels";
import type { Input } from "./ChosenServiceAccess.schema";
import type { ReactNode } from "react";

type ServiceParticipantPose = ParticipantFloorContacts & {
  travel: number;
  x: number;
  choosing: boolean;
  handX: number;
  handY: number;
};
type ParticipantFloorContacts = {
  rearY: number;
  y: number;
  frontY: number;
  leftFootX: number;
  rightFootX: number;
  leftFootY: number;
  rightFootY: number;
};

type Props = {
  input: Input;
  frame: number;
  accent: string;
};

type GetServiceParticipantPoseOptions = {
  input: Input;
  frame: number;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};
/** Samples the authored service participant pose. */
function _getServiceParticipantPose({
  input,
  frame,
  motion,
}: Readonly<GetServiceParticipantPoseOptions>): ServiceParticipantPose {
  const chosenIndex = input.services.findIndex(
    propEq("id", input.chosenServiceId),
  );
  const doorX = 160 + ((chosenIndex + 0.5) * 640) / input.services.length;
  const travel = motion.ramp(frame, 78, motion.scale(42), motion.travel.easing);
  const approach = motion.ramp(
    frame,
    78,
    motion.scale(20),
    motion.travel.easing,
  );
  const entry = motion.ramp(frame, 98, motion.scale(22), motion.travel.easing);
  const x =
    frame < 98
      ? Motion.mix({ t: approach, from: 60, to: doorX - 100 })
      : Motion.mix({ t: entry, from: doorX - 100, to: doorX });
  const choosing = frame >= 24 && frame < 44;
  const propulsion = Math.sin(Math.PI * travel) * Math.sin(frame * 0.7) * 8;
  const wheelAngle = -Math.PI / 2 + propulsion * 0.08;
  const contacts = _getParticipantFloorContacts({
    x,
    doorX,
    input,
    propulsion,
  });
  const handX = choosing
    ? x + Math.sign(doorX - x) * 50
    : input.participantMobility === "wheelchair"
      ? x - 6 + Math.cos(wheelAngle) * 20
      : x + 12 + propulsion;
  const handY = choosing
    ? contacts.y - 70
    : input.participantMobility === "wheelchair"
      ? contacts.rearY + Math.sin(wheelAngle) * 20
      : contacts.y - 29;
  return { travel, x, choosing, ...contacts, handX, handY };
}

/** Computes wheel and foot contact from the unchanged access-floor geometry. */
function _getParticipantFloorContacts({
  x,
  doorX,
  input,
  propulsion,
}: Readonly<GetParticipantFloorContactsOptions>): ParticipantFloorContacts {
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
  return { rearY, y, frontY, leftFootX, rightFootX, leftFootY, rightFootY };
}

/**
 * The participant points, then walks or self-propels through the chosen door.
 */
export function AccessParticipant({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const {
    travel,
    x,
    choosing,
    rearY,
    y,
    frontY,
    leftFootX,
    rightFootX,
    leftFootY,
    rightFootY,
    handX,
    handY,
  } = _getServiceParticipantPose({ input, frame, motion });
  return (
    <g
      data-participant-position={travel === 1 ? "inside" : "outside"}
      data-x={x}
      data-y={y}
    >
      <ServiceParticipantHead {...{ accent, tokens, scales, x, y }} />
      <ServiceParticipantBody
        {...{ input, x, y, frontY, leftFootX, leftFootY, rightFootX }}
        {...{ rightFootY, tokens, accent, scales }}
      />
      <ServiceParticipantWheels
        {...{ input, accent, scales, tokens, x, rearY, frontY, frame }}
        travel={travel}
      />
      <ServiceParticipantArm
        {...{ input, accent, tokens, scales, x, choosing, y, handX }}
        handY={handY}
      />
    </g>
  );
}

type GetParticipantFloorContactsOptions = {
  x: number;
  doorX: number;
  input: Input;
  propulsion: number;
};

/** Result of the authored AccessParticipant calculation. */
export type AccessParticipantGetServiceParticipantPoseValue = ReturnType<
  typeof _getServiceParticipantPose
>;
