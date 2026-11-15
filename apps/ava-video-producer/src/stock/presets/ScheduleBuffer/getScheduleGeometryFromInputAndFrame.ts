import { EASE, mix, ramp } from "../../../motion";
import type { Input } from "./ScheduleBuffer.schema";
/** Data for getScheduleGeometryFromInputAndFrame. */
type GetScheduleGeometryResult = {
  tasks: Array<{
    x: number;
    width: number;
    id: string;
    label: string;
    duration: number;
  }>;
  delayWidth: number;
  delayX: number;
  delayY: number;
  reserveX: number;
  reserveWidth: number;
  remaining: number;
};

/** Exact duration geometry preserves task widths and the fixed endpoint. */
export function getScheduleGeometryFromInputAndFrame({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): GetScheduleGeometryResult {
  const taskUnits = input.tasks.reduce(
    (total, task) => total + task.duration,
    0,
  );
  const scale = 880 / (taskUnits + input.reserveUnits);
  const interruptionIndex = input.tasks.findIndex(
    ({ id }) => id === input.interruption.afterTaskId,
  );
  const progress = ramp(frame, 74, 44, EASE.inOut);
  const delayWidth = input.interruption.duration * scale;
  let units = 0;
  const tasks = input.tasks.map((task, index) => {
    const x =
      40 +
      units * scale +
      (index > interruptionIndex ? delayWidth * progress : 0);
    units += task.duration;
    return { ...task, x, width: task.duration * scale };
  });
  return {
    tasks,
    delayWidth,
    delayX: tasks[interruptionIndex].x + tasks[interruptionIndex].width,
    delayY: mix(progress, 230, 310),
    reserveX: 40 + taskUnits * scale + delayWidth * progress,
    reserveWidth:
      (input.reserveUnits - input.interruption.duration * progress) * scale,
    remaining: input.reserveUnits - input.interruption.duration * progress,
  };
}
