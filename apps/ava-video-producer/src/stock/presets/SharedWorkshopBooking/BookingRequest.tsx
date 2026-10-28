import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { AgreementTab } from "./AgreementTab";
import { BookingParticipant } from "./BookingParticipant";
import { getBookingFromFrame } from "./getBookingFromFrame";
import { OriginalRequest } from "./OriginalRequest";
import type { Input } from "./SharedWorkshopBooking.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; index: number; accent: string };
/**
 * A participant moves their request, agrees its tab, then takes one use turn.
 */
export function BookingRequest({
  input,
  frame,
  index,
  accent,
}: Readonly<Props>): ReactNode {
  const request = input.requests[index];
  const scene = getBookingFromFrame({ input, frame, index });
  return (
    <g>
      <OriginalRequest input={input} scene={scene} index={index} />
      <rect
        data-request={request.id}
        x={scene.x}
        y={scene.y}
        width={scene.width}
        height={40}
        fill="none"
        stroke={accent}
        strokeWidth={2}
      />
      <LabelSlots
        labels={[
          [String(index + 1), scene.x + 10, scene.y + 26, 40, 16, 1],
          [`${index + 1}`, 48, 130 + index * 58, 30, 14, 1],
          [request.participant, 85, 130 + index * 58, 245, 14, 3],
        ]}
      />
      <AgreementTab scene={scene} requestId={request.id} accent={accent} />
      <BookingParticipant
        input={input}
        scene={scene}
        frame={frame}
        index={index}
        accent={accent}
      />
    </g>
  );
}
