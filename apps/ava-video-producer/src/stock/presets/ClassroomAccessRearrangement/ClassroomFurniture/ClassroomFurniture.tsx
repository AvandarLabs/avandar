import { propEq } from "@avandar/utils";
import { Motion } from "../../../../motion";
import { StockRect } from "../../../primitives/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ApproachTrace } from "../ApproachTrace";
import { ClassroomBoardText } from "../ClassroomBoardText";
import { ClassroomDesks } from "../ClassroomDesks";
import { ClassroomTable } from "../ClassroomTable";
import { ClassroomBoard } from "./ClassroomBoard";
import type { Input } from "../ClassroomAccessRearrangement.schema";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const progress = motion.ramp(
    frame,
    36,
    motion.scale(36),
    motion.travel.easing,
  );
  const hasTable = _hasAdaptation({ input, kind: "shared-table" });
  const hasBoard = _hasAdaptation({ input, kind: "large-print-board" });
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
      <ClassroomBoard
        hasBoard={hasBoard}
        progress={hasBoard ? progress : 0}
        accent={accent}
      />
      <ClassroomBoardText input={input} frame={frame} hasBoard={hasBoard} />
      <ApproachTrace input={input} progress={progress} accent={accent} />
    </g>
  );
}
function _hasAdaptation({
  input,
  kind,
}: Readonly<{
  input: Input;
  kind: Input["adaptations"][number]["kind"];
}>): boolean {
  return input.adaptations.some(propEq("kind", kind));
}
