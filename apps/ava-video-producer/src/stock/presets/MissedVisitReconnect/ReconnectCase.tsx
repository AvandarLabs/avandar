import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CaseHome } from "./CaseHome";
import { ContactAttempt } from "./ContactAttempt";
import { ReconnectBookingOutcome } from "./ReconnectBookingOutcome/ReconnectBookingOutcome";
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
  const motion = GraphicThemeHooks.useGraphicMotion();
  const y = 160 + index * 48;
  return (
    <g
      data-case={item.id}
      data-outcome={item.outcome}
      opacity={motion.reveal(frame, 12 + index * motion.stagger.list)}
    >
      <CaseHome item={item} y={y} />
      <ReturningPerson {...{ item, index, y, frame, accent }} />
      <ContactAttempt {...{ item, index, y, frame, accent }} />
      <ReconnectBookingOutcome {...{ item, index, y, frame, accent }} />
      <ReconnectOutcomeMark
        outcome={item.outcome}
        x={395}
        {...{ y, frame, accent }}
      />
    </g>
  );
}
