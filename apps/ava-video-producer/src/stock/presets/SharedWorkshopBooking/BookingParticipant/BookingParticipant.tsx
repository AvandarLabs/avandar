import { mix } from "../../../../motion";
import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { PersonGlyph } from "../../../primitives/PersonGlyph/PersonGlyph";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { RequestArm } from "./RequestArm";
import type { VideoMotion } from "../../../../videoTheme/createVideoMotion/createVideoMotion";
import type { getBookingFromFrame } from "../getBookingFromFrame";
import type { Input } from "../SharedWorkshopBooking.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  scene: ReturnType<typeof getBookingFromFrame>;
  frame: number;
  index: number;
  accent: string;
};
/**
 * Frames of one repeated hand stroke while a participant works. A cycle
 * length, so tempo never changes it.
 */
const STROKE_PERIOD = 6;
function _getHand({
  input,
  scene,
  frame,
  motion,
}: Readonly<
  Pick<Props, "input" | "scene" | "frame"> & { motion: VideoMotion }
>) {
  const phase = frame % STROKE_PERIOD;
  const halfPeriod = STROKE_PERIOD / 2;
  const stroke =
    scene.use === 1
      ? motion.ramp(phase, 0, halfPeriod, motion.entrance.easing) *
        (1 - motion.ramp(phase, halfPeriod, halfPeriod, motion.exit.easing))
      : 0;
  const handX = mix(
    scene.use,
    scene.x + scene.width / 2,
    240 + (input.machine.kind === "workbench" ? stroke * 10 : 0),
  );
  const handY = mix(
    scene.use,
    scene.y,
    405 - (input.machine.kind === "sewing-machine" ? stroke * 4 : 0),
  );
  return { handX, handY };
}
/**
 * One keyed participant keeps contact during agreement and an authored work
 * turn.
 */
export function BookingParticipant({
  input,
  scene,
  frame,
  index,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const request = input.requests[index];
  const personX = mix(scene.use, scene.x + scene.width / 2, 210);
  const personY = mix(scene.use, scene.y - 28, 380);
  const { handX, handY } = _getHand({ input, scene, frame, motion });
  return (
    <g data-participant={request.id}>
      <PersonGlyph
        x={personX}
        y={personY}
        color={accent}
        posture={scene.use === 1 ? "seated" : "standing"}
      />
      <LabelSlots
        labels={[[String(index + 1), personX - 28, personY - 18, 20, 12, 1]]}
      />
      <RequestArm
        requestId={request.id}
        person={{ x: personX, y: personY }}
        hand={{ x: handX, y: handY }}
        accent={accent}
      />
      {scene.use === 1 ? (
        <circle
          data-use-person={request.id}
          cx={handX}
          cy={handY}
          r={4}
          fill={accent}
        />
      ) : undefined}
    </g>
  );
}
