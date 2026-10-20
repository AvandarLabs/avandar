import { BookingRequest } from "./BookingRequest";
import { SharedMachine } from "./SharedMachine";
import { WorkshopCaptions } from "./WorkshopCaptions";
import { WorkshopTimeRuler } from "./WorkshopTimeRuler";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./SharedWorkshopBooking.schema";
import type { ReactNode } from "react";
type Props = GraphicProps & { input: Input };
/**
 * Negotiated requests share one machine and retain unresolved authored choices.
 */
export function SharedWorkshopBooking({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <WorkshopCaptions input={input} />
      <WorkshopTimeRuler input={input} />{" "}
      <SharedMachine input={input} accent={accent} />
      {input.requests.map((request, index) => (
        <BookingRequest
          key={request.id}
          input={input}
          frame={frame}
          index={index}
          accent={accent}
        />
      ))}
    </g>
  );
}
