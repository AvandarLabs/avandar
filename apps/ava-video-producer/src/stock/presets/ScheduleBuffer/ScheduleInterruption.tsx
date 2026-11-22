import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getScheduleGeometryFromInputAndFrame } from "./getScheduleGeometryFromInputAndFrame";
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
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g opacity={motion.ramp(frame, 44, motion.scale(30))}>
      <StockRect
        data-interruption-segment="true"
        x={state.delayX}
        y={state.delayY}
        width={state.delayWidth}
        height={60}
        fill={tokens.color.highlight}
        fillOpacity={scales.wash(atomic.opacity["30"])}
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <ScheduleLabelSlot
        index={input.tasks.length + 1}
        label={input.interruption.label}
        value={input.interruption.duration}
        unitLabel={input.unitLabel}
        showValues={input.showValues}
        targetX={state.delayX + state.delayWidth / 2}
        color={tokens.color.highlight}
        numSlots={numSlots}
      />
    </g>
  );
}
