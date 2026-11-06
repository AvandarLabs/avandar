import { EASE, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { ApproachTrace } from "./ApproachTrace";
import { ClassroomBoardText } from "./ClassroomBoardText";
import { ClassroomDesks } from "./ClassroomDesks";
import { ClassroomTable } from "./ClassroomTable";
import type { Input } from "./ClassroomAccessRearrangement.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * Furniture clears the approach before learners enter, with selected changes
 * only.
 */
export function ClassroomFurniture({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const progress = ramp(frame, 36, 36, EASE.inOut);
  const hasTable = input.adaptations.some(
    ({ kind }) => kind === "shared-table",
  );
  const hasBoard = input.adaptations.some(
    ({ kind }) => kind === "large-print-board",
  );
  const boardProgress = hasBoard ? progress : 0;
  return (
    <g>
      <rect
        data-common-activity="true"
        x={155}
        y={240}
        width={450}
        height={255}
        rx={45}
        fill={accent}
        fillOpacity={0.04}
        stroke={accent}
        strokeOpacity={0.25}
      />
      <ClassroomDesks progress={progress} />
      <ClassroomTable hasTable={hasTable} progress={progress} accent={accent} />
      <rect
        data-board-adaptation={hasBoard}
        x={340}
        y={100}
        width={350}
        height={105}
        rx={8}
        fill={STOCK.surface}
        stroke={hasBoard ? accent : STOCK.line}
        strokeWidth={1 + boardProgress * 2}
      />
      <ClassroomBoardText input={input} frame={frame} hasBoard={hasBoard} />
      <ApproachTrace input={input} progress={progress} accent={accent} />
    </g>
  );
}
