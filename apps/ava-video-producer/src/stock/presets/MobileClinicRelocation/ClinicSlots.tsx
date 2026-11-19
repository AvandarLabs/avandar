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
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
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
            <StockRect
              data-slot-id={slot.id}
              data-occupied={occupied}
              x={630}
              y={145 + index * 44}
              width={30}
              height={30}
              rx={scales.corner(tokens.corner.chip)}
              fill={occupied ? accent : tokens.color.surface}
              stroke={occupied ? accent : tokens.color.inactive}
              fillOpacity={
                occupied
                  ? motion.ramp(
                      frame,
                      96,
                      motion.scale(17),
                      motion.entrance.easing,
                    )
                  : 1
              }
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
