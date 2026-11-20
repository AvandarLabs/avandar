import { FitText } from "../../../primitives/FitText/FitText";
import { StockRect } from "../../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { SlotTab } from "./SlotTab";
import type { Input } from "../MobileClinicRelocation.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Every supplied appointment has one tab, never a duplicate booking glyph. */
export function ClinicSlots({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
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
