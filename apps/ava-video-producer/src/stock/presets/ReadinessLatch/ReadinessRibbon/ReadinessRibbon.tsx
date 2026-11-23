import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getReadinessRibbonGeometry } from "../getReadinessRibbonGeometry";
import { ParticipantRibbonAndPin } from "./ParticipantRibbonAndPin";
import type { Input } from "../ReadinessLatch.schema";
import type { ReactNode } from "react";

type Props = {
  participant: Input["participants"][number];
  index: number;
  numParticipants: number;
  maxWork: number;
  frame: number;
  input: Input;
  accent: string;
};

type TrackOptions = {
  participant: Readonly<Props>["participant"];
  index: Readonly<Props>["index"];
  numParticipants: Readonly<Props>["numParticipants"];
  maxWork: Readonly<Props>["maxWork"];
  frame: Readonly<Props>["frame"];
  input: Readonly<Props>["input"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};

type GetReadinessRibbonTrackStateResult = {
  track: ReturnType<typeof getReadinessRibbonGeometry>["track"];
  ribbon: ReturnType<typeof getReadinessRibbonGeometry>["ribbon"];
  pin: ReturnType<typeof getReadinessRibbonGeometry>["pin"];
  labels: {
    participant: Readonly<Props>["participant"];
    input: Readonly<Props>["input"];
    state:
      | Readonly<Props>["input"]["copy"]["ready"]
      | Readonly<Props>["input"]["copy"]["waiting"];
    horizontal: boolean;
    x: number;
    y: number;
  };
};

/** Samples the readiness ribbon track state for the current authored frame. */
function _getReadinessRibbonTrackState({
  participant,
  index,
  numParticipants,
  maxWork,
  frame,
  input,
  motion,
}: Readonly<TrackOptions>): GetReadinessRibbonTrackStateResult {
  const horizontal = input.orientation === "horizontal";
  const position = (index * 280) / (numParticipants - 1);
  const x = horizontal ? 300 : 300 + (index * 584) / (numParticipants - 1);
  const y = horizontal ? 135 + position : 300;
  const duration = (88 * participant.workUnits) / maxWork;
  const progress =
    motion.ramp(frame, 24, duration, motion.travel.easing) *
    (participant.ready ? 1 : 0.72);
  const withdrawal = participant.ready
    ? motion.ramp(frame, 24 + duration, motion.whip)
    : 0;
  const state =
    participant.ready && frame >= 24 + duration
      ? input.copy.ready
      : input.copy.waiting;
  const { track, ribbon, pin } = getReadinessRibbonGeometry({
    horizontal,
    x,
    y,
    progress,
    withdrawal,
  });
  const labels = { participant, input, state, horizontal, x, y };
  return { track, ribbon, pin, labels };
}

/** A stable branch owns one progressing ribbon and one retractable pin. */
export function ReadinessRibbon({
  participant,
  index,
  numParticipants,
  maxWork,
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const { track, ribbon, pin, labels } = _getReadinessRibbonTrackState({
    participant,
    index,
    numParticipants,
    maxWork,
    frame,
    input,
    motion,
  });
  return (
    <g
      opacity={motion.ramp(
        frame,
        12 + index * motion.stagger.list,
        motion.scale(10),
      )}
    >
      <ParticipantRibbonAndPin
        participant={participant}
        input={input}
        accent={accent}
        tokens={tokens}
        scales={scales}
        track={track}
        ribbon={ribbon}
        pin={pin}
        labels={labels}
      />
    </g>
  );
}
