import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getScheduleGeometryFromInputAndFrame } from "./getScheduleGeometryFromInputAndFrame";
import { ReserveHatching } from "./ReserveHatching";
import { ScheduleLabelSlot } from "./ScheduleLabelSlot";
import type { Input } from "./ScheduleBuffer.schema";
import type { ReactNode } from "react";

type Props = {
  state: ReturnType<typeof getScheduleGeometryFromInputAndFrame>;
  input: Input;
  numSlots: number;
};
/** Hatched reserve shortens by the interruption width, including to zero. */
export function ScheduleReserve({
  state,
  input,
  numSlots,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <g>
      <StockRect
        data-reserve-segment="true"
        data-remaining-reserve={Number(state.remaining.toFixed(5))}
        x={state.reserveX}
        y={310}
        width={state.reserveWidth}
        height={60}
        fill={tokens.color.surface}
        stroke={tokens.color.inactive}
        strokeDasharray={tokens.dash.pending.join(" ")}
      />
      <ReserveHatching x={state.reserveX} width={state.reserveWidth} />
      <ScheduleLabelSlot
        index={input.tasks.length}
        label={input.scheduleLabels.reserve}
        value={state.remaining}
        unitLabel={input.unitLabel}
        showValues={input.showValues}
        targetX={state.reserveX + state.reserveWidth / 2}
        color={tokens.color.textMuted}
        numSlots={numSlots}
      />
    </g>
  );
}
