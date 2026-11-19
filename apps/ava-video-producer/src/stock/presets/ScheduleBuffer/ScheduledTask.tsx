import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
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
/** One task keeps its duration width while later work shifts together. */
export function ScheduledTask({
  task,
  index,
  input,
  frame,
  accent,
  numSlots,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  return (
    <g opacity={motion.reveal(frame, 12 + index * 5)}>
      <StockRect
        data-task-id={task.id}
        x={task.x}
        y={310}
        width={task.width}
        height={60}
        fill={accent}
        fillOpacity={0.18 + index * 0.04}
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
