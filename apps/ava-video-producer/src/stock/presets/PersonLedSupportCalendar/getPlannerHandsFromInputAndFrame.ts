import { Motion } from "../../../motion";
import { AppointmentGeometry } from "./AppointmentGeometry";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./PersonLedSupportCalendar.schema";

type GetPlannerHandsFromInputAndFrameWorkerOptions = {
  frame: Readonly<{
    input: Input;
    frame: number;
    motion: VideoMotion;
  }>["frame"];
  motion: Readonly<{
    input: Input;
    frame: number;
    motion: VideoMotion;
  }>["motion"];
  appointment: ReturnType<typeof AppointmentGeometry.fromInput>;
  agreement: { x: number; y: number };
  proposalContact: number;
};

type ParticipantOptions = {
  input: Readonly<{
    input: Input;
    frame: number;
    motion: VideoMotion;
  }>["input"];
  frame: Readonly<{
    input: Input;
    frame: number;
    motion: VideoMotion;
  }>["frame"];
  motion: Readonly<{
    input: Input;
    frame: number;
    motion: VideoMotion;
  }>["motion"];
};

type ParticipantResult = {
  participant: { x: number; y: number };
  agreement: { x: number; y: number };
  worker: {
    x: number;
    y: number;
  };
};

/**
 * Samples the planner hands from input and frame worker for the current
 * authored frame.
 */
function _getPlannerHandsFromInputAndFrameWorker({
  frame,
  motion,
  appointment,
  agreement,
  proposalContact,
}: Readonly<GetPlannerHandsFromInputAndFrameWorkerOptions>): {
  x: number;
  y: number;
} {
  const agreementContact =
    motion.ramp(frame, 100, motion.scale(20), motion.entrance.easing) *
    (1 - motion.reveal(frame, 132));
  const worker =
    frame < 80
      ? {
          x: Motion.mix({
            t: proposalContact,
            from: 835,
            to: appointment.gripX,
          }),
          y: Motion.mix({
            t: proposalContact,
            from: 170,
            to: appointment.gripY,
          }),
        }
      : {
          x: Motion.mix({
            t: agreementContact,
            from: 835,
            to: agreement.x,
          }),
          y: Motion.mix({
            t: agreementContact,
            from: 170,
            to: agreement.y,
          }),
        };
  return worker;
}

/**
 * Samples the planner hands from input and frame participant state for the
 * current authored frame.
 */
function _getPlannerHandsFromInputAndFrameParticipantState({
  input,
  frame,
  motion,
}: Readonly<ParticipantOptions>): ParticipantResult {
  const appointment = AppointmentGeometry.fromInput({ input, frame, motion });
  const participantContact =
    frame < 52
      ? motion.ramp(frame, 36, motion.scale(16), motion.entrance.easing)
      : 1 - motion.reveal(frame, 100);
  const participant = {
    x: Motion.mix({
      t: participantContact,
      from: 150,
      to: appointment.gripX,
    }),
    y: Motion.mix({
      t: participantContact,
      from: 180,
      to: appointment.gripY,
    }),
  };
  const agreement = { x: 660, y: 490 };
  const proposalContact =
    1 - motion.ramp(frame, 36, motion.scale(16), motion.exit.easing);
  const worker = _getPlannerHandsFromInputAndFrameWorker({
    frame,
    motion,
    appointment,
    agreement,
    proposalContact,
  });
  return { participant, agreement, worker };
}

/** Hand trajectories preserve contact through proposal, carry and agreement. */
export function getPlannerHandsFromInputAndFrame({
  input,
  frame,
  motion,
}: Readonly<{
  input: Input;
  frame: number;
  motion: VideoMotion;
}>): {
  participant: {
    x: number;
    y: number;
  };
  worker: {
    x: number;
    y: number;
  };
  agreement: {
    x: number;
    y: number;
  };
} {
  const { participant, agreement, worker } =
    _getPlannerHandsFromInputAndFrameParticipantState({ input, frame, motion });
  return { participant, worker, agreement };
}
