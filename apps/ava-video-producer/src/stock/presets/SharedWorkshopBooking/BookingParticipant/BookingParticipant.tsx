import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { BookingPersonAndUseMarker } from "./BookingPersonAndUseMarker";
import type { VideoMotion } from "../../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
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
 * Frames of one repeated hand stroke while a participant works. A cycle length,
 * so tempo never changes it.
 */
const STROKE_PERIOD = 6;

function _getHand({
  input,
  scene,
  frame,
  motion,
}: Readonly<
  Pick<Props, "input" | "scene" | "frame"> & {
    motion: VideoMotion;
  }
>) {
  const phase = frame % STROKE_PERIOD;
  const halfPeriod = STROKE_PERIOD / 2;
  const stroke =
    scene.use === 1
      ? motion.ramp(phase, 0, halfPeriod, motion.entrance.easing) *
        (1 - motion.ramp(phase, halfPeriod, halfPeriod, motion.exit.easing))
      : 0;
  const handX = Motion.mix({
    t: scene.use,
    from: scene.x + scene.width / 2,
    to: 240 + (input.machine.kind === "workbench" ? stroke * 10 : 0),
  });
  const handY = Motion.mix({
    t: scene.use,
    from: scene.y,
    to: 405 - (input.machine.kind === "sewing-machine" ? stroke * 4 : 0),
  });
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
  const personX = Motion.mix({
    t: scene.use,
    from: scene.x + scene.width / 2,
    to: 210,
  });
  const personY = Motion.mix({
    t: scene.use,
    from: scene.y - 28,
    to: 380,
  });
  const { handX, handY } = _getHand({ input, scene, frame, motion });
  return (
    <g data-participant={request.id}>
      <BookingPersonAndUseMarker
        scene={scene}
        index={index}
        accent={accent}
        request={request}
        personX={personX}
        personY={personY}
        handX={handX}
        handY={handY}
      />
    </g>
  );
}
