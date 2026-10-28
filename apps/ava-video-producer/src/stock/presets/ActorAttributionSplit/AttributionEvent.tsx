import { propEq } from "@avandar/utils";
import { EASE, mix, ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { RecordedStamp } from "./RecordedStamp";
import { StampHandling } from "./StampHandling";
import type { Input } from "./ActorAttributionSplit.schema";
import type { ReactNode } from "react";
type Props = {
  frame: number;
  input: Input;
  event: Input["events"][number];
  index: number;
  accent: string;
};
function _getEventStamp({
  frame,
  input,
  event,
  index,
}: Readonly<Omit<Props, "accent">>) {
  const personIndex = input.collaborators.findIndex(
    propEq("id", event.collaboratorId),
  );
  const accountId =
    event.phase === "shared"
      ? input.sharedAccountId
      : input.collaborators[personIndex].individualAccountId;
  const account = input.accounts.find(propEq("id", accountId))!;
  const onset = [12, 37, 96, 118][index];
  const travel = ramp(frame, onset, 20, EASE.inOut);
  const x = mix(travel, 300, 590),
    y = mix(
      travel,
      event.phase === "shared" ? 275 : 170 + personIndex * 160,
      170 + index * 82,
    );
  const visible = ramp(frame, onset, 5);
  return { personIndex, accountId, account, onset, travel, x, y, visible };
}
/** One authored action leaves a permanent stamp with its recorded account. */
export function AttributionEvent({
  frame,
  input,
  event,
  index,
  accent,
}: Readonly<Props>): ReactNode {
  const { personIndex, accountId, account, onset, travel, x, y, visible } =
    _getEventStamp({ frame, input, event, index });
  return (
    <g data-event={event.id} data-account={accountId} opacity={visible}>
      <g opacity={travel}>
        <LabelSlots
          labels={[[event.label, 575, 135 + index * 82, 320, 12, 3]]}
        />
      </g>
      {frame >= onset && frame < onset + 20 ? (
        <StampHandling
          x={x}
          y={y}
          personIndex={personIndex}
          eventId={event.id}
          showGuides={input.showActionGuides}
          accent={accent}
        />
      ) : undefined}
      <RecordedStamp
        eventId={event.id}
        accountLabel={account.label}
        x={x}
        y={y}
        color={event.phase === "shared" ? STOCK.muted : accent}
      />
    </g>
  );
}
