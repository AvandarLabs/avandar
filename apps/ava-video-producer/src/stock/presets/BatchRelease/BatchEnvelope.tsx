import { mix, ramp } from "../../../motion";
import { useGraphicMotion } from "../../theme/useGraphicTheme/useGraphicTheme";
import { BatchFrame } from "./BatchFrame";
import { BatchMembers } from "./BatchMembers";
import { BatchReleaseCaption } from "./BatchReleaseCaption";
import type { Input } from "./BatchRelease.schema";
import type { ReactNode } from "react";

type Props = {
  batch: Input["batches"][number];
  index: number;
  input: Input;
  frame: number;
  accent: string;
};

/** Frames the first batch takes to cross the dispatch boundary. */
const FIRST_DISPATCH_FRAMES = 30;
/** Frames the later batch takes to cross the dispatch boundary. */
const LATER_DISPATCH_FRAMES = 18;
/** How far before its first member a batch starts to fade in. */
const LEAD_IN_FRAMES = 6;
/**
 * The open cradle closes only when all its members have reached their slots.
 */
export function BatchEnvelope({
  batch,
  index,
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  const start = index ? 94 : 18;
  const completeAt = index ? 124 : 68;
  const dispatchAt = index ? 128 : 82;
  const dispatchDuration = motion.scale(
    index ? LATER_DISPATCH_FRAMES : FIRST_DISPATCH_FRAMES,
  );
  const x = mix(
    ramp(frame, dispatchAt, dispatchDuration, motion.travel.easing),
    70,
    560,
  );
  const y = 210 + index * 200;
  const width = 360;
  const isComplete = frame >= completeAt;
  return (
    <g opacity={motion.reveal(frame, start - LEAD_IN_FRAMES)}>
      <BatchFrame
        batchId={batch.id}
        isComplete={isComplete}
        x={x}
        y={y}
        width={width}
        frame={frame}
        completeAt={completeAt}
        accent={accent}
      />
      <BatchMembers
        batch={batch}
        input={input}
        frame={frame}
        accent={accent}
        layout={{ x, y, start, completeAt }}
      />
      <BatchReleaseCaption
        frame={frame}
        completeAt={completeAt}
        x={x}
        y={y}
        text={input.releaseLabel}
      />
    </g>
  );
}
