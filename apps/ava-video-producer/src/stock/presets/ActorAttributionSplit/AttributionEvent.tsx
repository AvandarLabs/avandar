import { propEq } from "@avandar/utils";
import { mix, ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { RecordedStamp } from "./RecordedStamp";
import { StampHandling } from "./StampHandling";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./ActorAttributionSplit.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  input: Input;
  event: Input["events"][number];
  index: number;
  accent: string;
};
/** Frames a stamp takes to travel from its actor into the ledger. */
const TRAVEL_FRAMES = 20;
/** Frames a stamp takes to appear. */
const APPEAR_FRAMES = 5;
function _getEventStamp({
  frame,
  input,
  event,
  index,
  motion,
}: Readonly<Omit<Props, "accent"> & { motion: VideoMotion }>) {
  const personIndex = input.collaborators.findIndex(
    propEq("id", event.collaboratorId),
  );
  const accountId =
    event.phase === "shared"
      ? input.sharedAccountId
      : input.collaborators[personIndex].individualAccountId;
  const account = input.accounts.find(propEq("id", accountId))!;
  const onset = [12, 37, 96, 118][index];
  const travelFrames = motion.scale(TRAVEL_FRAMES);
  const travel = ramp(frame, onset, travelFrames, motion.travel.easing);
  const x = mix(travel, 300, 590),
    y = mix(
      travel,
      event.phase === "shared" ? 275 : 170 + personIndex * 160,
      170 + index * 82,
    );
  const visible = ramp(
    frame,
    onset,
    motion.scale(APPEAR_FRAMES),
    motion.reveal.easing,
  );
  return {
    personIndex,
    accountId,
    account,
    onset,
    travelFrames,
    travel,
    x,
    y,
    visible,
  };
}
/** One authored action leaves a permanent stamp with its recorded account. */
export function AttributionEvent({
  frame,
  input,
  event,
  index,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const stamp = _getEventStamp({ frame, input, event, index, motion });
  return (
    <g
      data-event={event.id}
      data-account={stamp.accountId}
      opacity={stamp.visible}
    >
      <g opacity={stamp.travel}>
        <LabelSlots
          labels={[[event.label, 575, 135 + index * 82, 320, 12, 3]]}
        />
      </g>
      {frame >= stamp.onset && frame < stamp.onset + stamp.travelFrames ? (
        <StampHandling
          x={stamp.x}
          y={stamp.y}
          personIndex={stamp.personIndex}
          eventId={event.id}
          showGuides={input.showActionGuides}
          accent={accent}
        />
      ) : undefined}
      <RecordedStamp
        eventId={event.id}
        accountLabel={stamp.account.label}
        x={stamp.x}
        y={stamp.y}
        color={event.phase === "shared" ? tokens.color.inactive : accent}
      />
    </g>
  );
}
