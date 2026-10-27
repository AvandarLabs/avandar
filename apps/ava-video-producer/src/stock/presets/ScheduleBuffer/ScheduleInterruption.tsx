import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { getScheduleGeometryFromInputAndFrame } from "./getScheduleGeometryFromInputAndFrame";
import { ScheduleLabelSlot } from "./ScheduleLabelSlot";
import type { Input } from "./ScheduleBuffer.schema";
import type { ReactNode } from "react";
type Props = {
  state: ReturnType<typeof getScheduleGeometryFromInputAndFrame>;
  input: Input;
  numSlots: number;
  frame: number;
};
/** The delay descends into the gap opened after its named task. */
export function ScheduleInterruption({
  state,
  input,
  numSlots,
  frame,
}: Readonly<Props>): ReactNode {
  return (
    <g opacity={ramp(frame, 44, 30)}>
      <rect
        data-interruption-segment="true"
        x={state.delayX}
        y={state.delayY}
        width={state.delayWidth}
        height={60}
        fill={STOCK.orange}
        fillOpacity={0.3}
        stroke={STOCK.orange}
        strokeWidth={2}
      />
      <ScheduleLabelSlot
        index={input.tasks.length + 1}
        label={input.interruption.label}
        value={input.interruption.duration}
        unitLabel={input.unitLabel}
        showValues={input.showValues}
        targetX={state.delayX + state.delayWidth / 2}
        color={STOCK.orange}
        numSlots={numSlots}
      />
    </g>
  );
}
