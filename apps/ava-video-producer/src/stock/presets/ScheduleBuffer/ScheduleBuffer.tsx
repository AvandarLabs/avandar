import { ramp } from "../../../motion";
import { getScheduleGeometryFromInputAndFrame } from "./getScheduleGeometryFromInputAndFrame";
import { ScheduleBackdrop } from "./ScheduleBackdrop";
import { ScheduledTask } from "./ScheduledTask";
import { ScheduleInterruption } from "./ScheduleInterruption";
import { ScheduleReserve } from "./ScheduleReserve";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./ScheduleBuffer.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/** An interruption shifts later tasks into reserve without moving delivery. */
export function ScheduleBuffer({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const state = getScheduleGeometryFromInputAndFrame({ frame, input });
  const numSlots = input.tasks.length + 2;
  return (
    <g opacity={ramp(frame, 12, 12)}>
      <ScheduleBackdrop input={input} />
      {state.tasks.map((task, index) => (
        <ScheduledTask
          key={task.id}
          task={task}
          index={index}
          input={input}
          frame={frame}
          accent={accent}
          numSlots={numSlots}
        />
      ))}
      <ScheduleReserve state={state} input={input} numSlots={numSlots} />
      <ScheduleInterruption
        state={state}
        input={input}
        numSlots={numSlots}
        frame={frame}
      />
    </g>
  );
}
