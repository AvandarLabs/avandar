import { mix, ramp, EASE } from "../../../motion";
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
  const start = index ? 94 : 18;
  const completeAt = index ? 124 : 68;
  const dispatchAt = index ? 128 : 82;
  const dispatchDuration = index ? 18 : 30;
  const x = mix(ramp(frame, dispatchAt, dispatchDuration, EASE.inOut), 70, 560);
  const y = 210 + index * 200;
  const width = 360;
  const isComplete = frame >= completeAt;
  return (
    <g opacity={ramp(frame, start - 6, 12)}>
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
