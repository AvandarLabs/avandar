import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getScheduleGeometryFromInputAndFrame } from "./getScheduleGeometryFromInputAndFrame";
import { ScheduleLabelSlot } from "./ScheduleLabelSlot";
import type { Input } from "./ScheduleBuffer.schema";
import type { ReactNode } from "react";

type Props = {
  task: ReturnType<
    typeof getScheduleGeometryFromInputAndFrame
  >["tasks"][number];
  index: number;
  input: Input;
  frame: number;
  accent: string;
  numSlots: number;
};
/** The tint of the first task, before the theme's tint strength. */
const TASK_TINT = 0.18;
/** How much darker each later task's tint is. */
const TASK_TINT_STEP = 0.04;
/** One task keeps its duration width while later work shifts together. */
export function ScheduledTask({
  task,
  index,
  input,
  frame,
  accent,
  numSlots,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g opacity={motion.reveal(frame, 12 + index * motion.scaleStagger(5))}>
      <StockRect
        data-task-id={task.id}
        x={task.x}
        y={310}
        width={task.width}
        height={60}
        fill={accent}
        fillOpacity={scales.wash(TASK_TINT + index * TASK_TINT_STEP)}
        stroke={accent}
      />
      <ScheduleLabelSlot
        index={index}
        label={task.label}
        value={task.duration}
        unitLabel={input.unitLabel}
        showValues={input.showValues}
        targetX={task.x + task.width / 2}
        color={accent}
        numSlots={numSlots}
      />
    </g>
  );
}
