import { EASE, mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { ReadinessRibbonLabels } from "./ReadinessRibbonLabels";
import type { Input } from "./ReadinessLatch.schema";
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
const PIN: { stroke: "#f0ba83"; strokeWidth: number; strokeLinecap: "round" } =
  {
    stroke: STOCK.orange,
    strokeWidth: 6,
    strokeLinecap: "round" as const,
  };
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
  const horizontal = input.orientation === "horizontal";
  const position = (index * 280) / (numParticipants - 1);
  const x = horizontal ? 300 : 300 + (index * 584) / (numParticipants - 1);
  const y = horizontal ? 135 + position : 300;
  const duration = (88 * participant.workUnits) / maxWork;
  const progress =
    ramp(frame, 24, duration, EASE.inOut) * (participant.ready ? 1 : 0.72);
  const withdrawal = participant.ready ? ramp(frame, 24 + duration, 8) : 0;
  const state =
    participant.ready && frame >= 24 + duration
      ? input.copy.ready
      : input.copy.waiting;
  const track = {
    x,
    y,
    width: horizontal ? 350 : 8,
    height: horizontal ? 8 : 100,
  };
  const ribbon = {
    ...track,
    width: horizontal ? 350 * progress : 8,
    height: horizontal ? 8 : 100 * progress,
  };
  const pin = {
    x1: horizontal ? mix(withdrawal, 640, 692) : x - 18,
    x2: horizontal ? mix(withdrawal, 662, 714) : x + 26,
    y1: horizontal ? y + 4 : mix(withdrawal, 400, 350),
    y2: horizontal ? y + 4 : mix(withdrawal, 400, 350),
  };
  const labels = { participant, input, state, horizontal, x, y };
  return (
    <g opacity={ramp(frame, 12 + index * 2, 10)}>
      <rect {...track} rx={4} fill={STOCK.line} />
      <rect data-ribbon={participant.id} {...ribbon} rx={4} fill={accent} />
      <line data-pin={participant.id} {...pin} {...PIN} />
      {input.showLabels ? <ReadinessRibbonLabels {...labels} /> : undefined}
    </g>
  );
}
