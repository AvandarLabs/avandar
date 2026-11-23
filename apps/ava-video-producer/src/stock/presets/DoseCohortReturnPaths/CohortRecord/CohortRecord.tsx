import { propEq } from "@avandar/utils";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { VisitMark } from "../VisitMark";
import { type Props } from "./CohortRecordShared.types";
import { VisitArch } from "./VisitArch";
import type { Input } from "../DoseCohortReturnPaths.schema";
import type { ReactNode } from "react";

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
          input.visits.slice(0, visitIndex).some((visit) => {
            return participant.records.some((record) => {
              return record.visitId === visit.id && record.state === "missed";
            });
          }))))
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const state = participant.records.find(propEq("visitId", visit.id))?.state;
  if (state === undefined) {
    throw new Error("Every participant requires a record for this visit.");
  }
  const isEmphasized = _isEmphasized({ input, participant, state, visitIndex });
  const x = 380 + visitIndex * 155;
  return (
    <g
      data-record-person={participant.id}
      data-record-visit={visit.id}
      data-state={state}
      opacity={motion.reveal(
        frame,
        32 +
          visitIndex * motion.scaleStagger(18) +
          personIndex * motion.scaleStagger(2),
      )}
    >
      {state === "recorded" ? (
        <VisitArch {...{ participant, visit, visitIndex, y, frame }} x={x} />
      ) : undefined}
      <VisitMark
        state={state}
        x={x}
        y={y + 12}
        color={isEmphasized ? accent : tokens.color.textMuted}
      />
    </g>
  );
}
