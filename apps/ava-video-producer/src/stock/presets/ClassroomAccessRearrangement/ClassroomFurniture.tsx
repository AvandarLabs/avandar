import { mix } from "../../../motion";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { ApproachTrace } from "./ApproachTrace";
import { ClassroomBoardText } from "./ClassroomBoardText";
import { ClassroomDesks } from "./ClassroomDesks";
import { ClassroomTable } from "./ClassroomTable";
import type { Input } from "./ClassroomAccessRearrangement.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
const ACTIVITY_CORNER = 45;
const ACTIVITY_TINT = 0.04;
/**
 * Furniture clears the approach before learners enter, with selected changes
 * only.
 */
export function ClassroomFurniture({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const progress = motion.ramp(
    frame,
    36,
    motion.scale(36),
    motion.travel.easing,
  );
  const hasTable = input.adaptations.some(({ kind }) => {
    return kind === "shared-table";
  });
  const hasBoard = input.adaptations.some(({ kind }) => {
    return kind === "large-print-board";
  });
  const boardProgress = hasBoard ? progress : 0;
  return (
    <g>
      <StockRect
        data-common-activity="true"
        x={155}
        y={240}
        width={450}
        height={255}
        rx={scales.corner(ACTIVITY_CORNER)}
        fill={accent}
        fillOpacity={scales.wash(ACTIVITY_TINT)}
        stroke={accent}
        strokeOpacity={tokens.alpha.ghost}
      />
      <ClassroomDesks progress={progress} />
      <ClassroomTable hasTable={hasTable} progress={progress} accent={accent} />
      <StockRect
        data-board-adaptation={hasBoard}
        x={340}
        y={100}
        width={350}
        height={105}
        rx={scales.corner(tokens.corner.cell)}
        fill={tokens.color.surface}
        stroke={hasBoard ? accent : tokens.color.line}
        strokeWidth={scales.stroke(
          mix(boardProgress, tokens.stroke.hairline, tokens.stroke.emphasis),
        )}
      />
      <ClassroomBoardText input={input} frame={frame} hasBoard={hasBoard} />
      <ApproachTrace input={input} progress={progress} accent={accent} />
    </g>
  );
}
