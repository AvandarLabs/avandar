import { mix } from "../../../motion";
import { AppointmentGeometry } from "./AppointmentGeometry";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./PersonLedSupportCalendar.schema";
/** Hand trajectories preserve contact through proposal, carry and agreement. */
export function getPlannerHandsFromInputAndFrame({
  input,
  frame,
  motion,
}: Readonly<{ input: Input; frame: number; motion: VideoMotion }>): {
  participant: { x: number; y: number };
  worker: { x: number; y: number };
  agreement: { x: number; y: number };
} {
  const appointment = AppointmentGeometry.fromInput({ input, frame, motion });
  const participantContact =
    frame < 52
      ? motion.ramp(frame, 36, motion.scale(16), motion.entrance.easing)
      : 1 - motion.reveal(frame, 100);
  const participant = {
    x: mix(participantContact, 150, appointment.gripX),
    y: mix(participantContact, 180, appointment.gripY),
  };
  const agreement = { x: 660, y: 490 };
  const proposalContact =
    1 - motion.ramp(frame, 36, motion.scale(16), motion.exit.easing);
  const agreementContact =
    motion.ramp(frame, 100, motion.scale(20), motion.entrance.easing) *
    (1 - motion.reveal(frame, 132));
  const worker =
    frame < 80
      ? {
          x: mix(proposalContact, 835, appointment.gripX),
          y: mix(proposalContact, 170, appointment.gripY),
        }
      : {
          x: mix(agreementContact, 835, agreement.x),
          y: mix(agreementContact, 170, agreement.y),
        };
  return { participant, worker, agreement };
}
