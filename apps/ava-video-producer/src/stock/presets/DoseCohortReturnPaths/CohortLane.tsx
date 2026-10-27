import { propEq } from "@avandar/utils";
import { EASE, mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { CohortPerson } from "./CohortPerson";
import { CohortRecord } from "./CohortRecord";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./DoseCohortReturnPaths.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  participant: Input["participants"][number];
  index: number;
  frame: number;
  accent: string;
};
function _getPersonPosition({
  input,
  participant,
  index,
  frame,
}: Omit<Props, "accent">) {
  return input.visits.reduce(
    (position, visit, visitIndex) =>
      participant.records.find(propEq("visitId", visit.id))?.state ===
      "recorded"
        ? mix(
            ramp(frame, 30 + visitIndex * 18 + index * 2, 18, EASE.inOut),
            position,
            380 + visitIndex * 155,
          )
        : position,
    285,
  );
}
/** Stable identities move only to authored recorded visit positions. */
export function CohortLane({
  input,
  participant,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const y = 185 + index * 40;
  const x = _getPersonPosition({ input, participant, index, frame });
  return (
    <g
      data-participant={participant.id}
      opacity={ramp(frame, 12 + index * 2, 12)}
    >
      <SceneLabel
        text={participant.label}
        x={32}
        y={y - 5}
        width={215}
        lines={2}
      />
      <path
        d={`M280 ${y + 12} H900`}
        stroke={STOCK.line}
        strokeDasharray="3 6"
      />
      {input.visits.map((visit, visitIndex) => (
        <CohortRecord
          key={visit.id}
          input={input}
          participant={participant}
          visit={visit}
          visitIndex={visitIndex}
          personIndex={index}
          y={y}
          frame={frame}
          accent={accent}
        />
      ))}
      <CohortPerson id={participant.id} x={x} y={y - 10} accent={accent} />
    </g>
  );
}
