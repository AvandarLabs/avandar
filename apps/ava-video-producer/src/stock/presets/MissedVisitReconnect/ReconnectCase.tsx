import { ramp } from "../../../motion";
import { BookingTab } from "./BookingTab";
import { CaseHome } from "./CaseHome";
import { ContactAttempt } from "./ContactAttempt";
import { ReconnectOutcomeMark } from "./ReconnectOutcomeMark";
import { ReturningPerson } from "./ReturningPerson";
import type { Input } from "./MissedVisitReconnect.schema";
import type { ReactNode } from "react";

type Props = {
  item: Input["cases"][number];
  index: number;
  frame: number;
  accent: string;
};
/** Booking folds onto a calendar without moving the person through the door. */
export function ReconnectCase({
  item,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const y = 160 + index * 48;
  return (
    <g
      data-case={item.id}
      data-outcome={item.outcome}
      opacity={ramp(frame, 12 + index * 2, 12)}
    >
      <CaseHome item={item} y={y} />
      <ReturningPerson
        item={item}
        index={index}
        y={y}
        frame={frame}
        accent={accent}
      />
      <ContactAttempt
        item={item}
        index={index}
        y={y}
        frame={frame}
        accent={accent}
      />
      {item.outcome === "booked" ? (
        <BookingTab
          item={item}
          index={index}
          y={y}
          frame={frame}
          accent={accent}
        />
      ) : undefined}
      <ReconnectOutcomeMark
        outcome={item.outcome}
        x={395}
        y={y}
        frame={frame}
        accent={accent}
      />
    </g>
  );
}
