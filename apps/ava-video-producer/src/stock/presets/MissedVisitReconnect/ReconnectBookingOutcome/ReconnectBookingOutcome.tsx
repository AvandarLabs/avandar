import { BookingTab } from "../BookingTab";
import type { Input } from "../MissedVisitReconnect.schema";
import type { ReactNode } from "react";

type Props = {
  item: Input["cases"][number];
  index: number;
  y: number;
  frame: number;
  accent: string;
};

/** Renders the outline with authored geometry. */
export function ReconnectBookingOutcome({
  item,
  index,
  y,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {item.outcome === "booked" ? (
        <BookingTab {...{ item, index, y, frame, accent }} />
      ) : undefined}
    </>
  );
}
