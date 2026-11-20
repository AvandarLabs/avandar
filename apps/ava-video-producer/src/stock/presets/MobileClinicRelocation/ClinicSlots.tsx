import { FitText } from "../../primitives/FitText/FitText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./MobileClinicRelocation.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Every supplied appointment has one tab, never a duplicate booking glyph. */
export function ClinicSlots({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  return (
    <g>
      {input.slots.map((slot, index) => {
        const occupied = input.people.some(({ slotId }) => {
          return slotId === slot.id;
        });
        return (
          <g
            key={slot.id}
            opacity={motion.reveal(frame, 14 + index * motion.stagger.list)}
          >
            <SlotTab
              slotId={slot.id}
              index={index}
              isOccupied={occupied}
              frame={frame}
              accent={accent}
            />
            <FitText
              text={slot.label}
              x={680}
              y={162 + index * 44}
              width={240}
              fontSize={14}
              maxLines={2}
              breakLongWords
              normalizeWhitespace
            />
          </g>
        );
      })}
    </g>
  );
}

/** An appointment tab, filling in the accent once it is booked. */
function SlotTab({
  slotId,
  index,
  isOccupied,
  frame,
  accent,
}: Readonly<{
  slotId: string;
  index: number;
  isOccupied: boolean;
  frame: number;
  accent: string;
}>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  return (
    <StockRect
      data-slot-id={slotId}
      data-occupied={isOccupied}
      x={630}
      y={145 + index * 44}
      width={30}
      height={30}
      rx={scales.corner(tokens.corner.chip)}
      fill={isOccupied ? accent : tokens.color.surface}
      stroke={isOccupied ? accent : tokens.color.inactive}
      fillOpacity={
        isOccupied
          ? motion.ramp(frame, 96, motion.scale(17), motion.entrance.easing)
          : 1
      }
    />
  );
}
