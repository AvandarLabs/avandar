import { ramp, mix } from "../../../motion";
import { AppointmentGeometry } from "./AppointmentGeometry";
import type { Input } from "./PersonLedSupportCalendar.schema";
/** Hand trajectories preserve contact through proposal, carry and agreement. */
export function getPlannerHandsFromInputAndFrame({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): {
  participant: { x: number; y: number };
  worker: { x: number; y: number };
  agreement: { x: number; y: number };
} {
  const appointment = AppointmentGeometry.fromInput({ input, frame });
  const participantContact =
    frame < 52 ? ramp(frame, 36, 16) : 1 - ramp(frame, 100, 12);
  const participant = {
    x: mix(participantContact, 150, appointment.gripX),
    y: mix(participantContact, 180, appointment.gripY),
  };
  const agreement = { x: 660, y: 490 };
  const proposalContact = 1 - ramp(frame, 36, 16);
  const agreementContact = ramp(frame, 100, 20) * (1 - ramp(frame, 132, 12));
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
