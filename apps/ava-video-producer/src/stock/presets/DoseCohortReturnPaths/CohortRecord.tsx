import { propEq } from "@avandar/utils";
import { EASE, mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { VisitMark } from "./VisitMark";
import type { Input } from "./DoseCohortReturnPaths.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  participant: Input["participants"][number];
  visit: Input["visits"][number];
  visitIndex: number;
  personIndex: number;
  y: number;
  frame: number;
  accent: string;
};
function _isEmphasized({
  input,
  participant,
  state,
  visitIndex,
}: Readonly<
  Pick<Props, "input" | "participant" | "visitIndex"> & {
    state: Input["participants"][number]["records"][number]["state"];
  }
>) {
  return (
    input.emphasis === "all-records" ||
    (input.emphasis === "unknown-records" && state === "unknown") ||
    (input.emphasis === "missed-and-returned" &&
      (state === "missed" ||
        (state === "recorded" &&
          input.visits
            .slice(0, visitIndex)
            .some((visit) =>
              participant.records.some(
                (record) =>
                  record.visitId === visit.id && record.state === "missed",
              ),
            ))))
  );
}
/** Only recorded visits have an arch for the persistent person to enter. */
export function CohortRecord({
  input,
  participant,
  visit,
  visitIndex,
  personIndex,
  y,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const state = participant.records.find(propEq("visitId", visit.id))?.state;
  if (state === undefined) {
    throw new Error("Every participant requires a record for this visit.");
  }
  const isEmphasized = _isEmphasized({ input, participant, state, visitIndex });
  const x = 380 + visitIndex * 155;
  const shift = mix(ramp(frame, 24 + visitIndex * 18, 24, EASE.inOut), 35, 0);
  return (
    <g
      data-record-person={participant.id}
      data-record-visit={visit.id}
      data-state={state}
      opacity={ramp(frame, 32 + visitIndex * 18 + personIndex * 2, 12)}
    >
      {state === "recorded" ? (
        <path
          data-visit-arch={participant.id}
          data-arch-visit={visit.id}
          d={`M${x - 14 + shift} ${y + 5} V${y - 18} Q${x + shift} ${y - 34} ${x + 14 + shift} ${y - 18} V${y + 5}`}
          stroke={STOCK.line}
          fill="none"
        />
      ) : undefined}
      <VisitMark
        state={state}
        x={x}
        y={y + 12}
        color={isEmphasized ? accent : STOCK.muted}
      />
    </g>
  );
}
