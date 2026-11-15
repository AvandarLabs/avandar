import { EASE, mix, ramp } from "../../../motion";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./DoseCohortReturnPaths.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  visit: Input["visits"][number];
  index: number;
  frame: number;
  accent: string;
};
/** Visit captions and numerators remain attached to their moving column. */
export function VisitHeader({
  input,
  visit,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const x =
    380 +
    index * 155 +
    mix(ramp(frame, 24 + index * 18, 24, EASE.inOut), 35, 0);
  return (
    <g
      data-visit={visit.id}
      data-denominator={input.participants.length}
      opacity={ramp(frame, 12 + index * 2, 12)}
    >
      <SceneLabel text={visit.label} x={x - 75} y={100} width={140} lines={3} />
      {input.showFractions ? (
        <text
          data-fraction={visit.id}
          x={x}
          y={150}
          fontSize={16}
          fill={accent}
          textAnchor="middle"
        >
          {
            input.participants.filter((person) =>
              person.records.some(
                (record) =>
                  record.visitId === visit.id && record.state === "recorded",
              ),
            ).length
          }
          /{input.participants.length}
        </text>
      ) : undefined}
    </g>
  );
}
