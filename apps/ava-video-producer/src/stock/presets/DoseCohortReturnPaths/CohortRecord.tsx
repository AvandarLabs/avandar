import { propEq } from "@avandar/utils";
import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const state = participant.records.find(propEq("visitId", visit.id))?.state;
  if (state === undefined) {
    throw new Error("Every participant requires a record for this visit.");
  }
  const isEmphasized = _isEmphasized({ input, participant, state, visitIndex });
  const x = 380 + visitIndex * 155;
  const shift = mix(
    motion.ramp(
      frame,
      24 + visitIndex * motion.scaleStagger(18),
      motion.scale(24),
      motion.travel.easing,
    ),
    35,
    0,
  );
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
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${x - 14 + shift} ${y + 5} V${y - 18} Q${x + shift} ${y - 34} ${x + 14 + shift} ${y - 18} V${y + 5}`,
          }}
          profile={tokens.sketch.shape}
          data-visit-arch={participant.id}
          data-arch-visit={visit.id}
          stroke={tokens.color.line}
          fill="none"
        />
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
