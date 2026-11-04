import { Text } from "../../graphics-common";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./ClassroomDayPresence.schema";
import type { ReactNode } from "react";
/** Inputs for ClassroomDays. */
type Props = { input: Input; activeIndex: number };

/** Numbered authored days provide the visible key for every desk impression. */
export function ClassroomDays({
  input,
  activeIndex,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {input.days.map((day, index) => (
        <g key={day.id}>
          <Text x={32 + index * 310} y={32} size={16} fill={STOCK.muted}>
            {index + 1}
          </Text>
          <FitText
            text={day.label}
            x={56 + index * 310}
            y={32}
            width={270}
            fontSize={16}
            maxLines={3}
            breakLongWords
            normalizeWhitespace
          />
          <path
            d={`M ${32 + index * 310} 90 H ${308 + index * 310}`}
            stroke={index === activeIndex ? STOCK.cyan : STOCK.line}
            strokeWidth={index === activeIndex ? 3 : 1}
          />
        </g>
      ))}
      <FitText
        text={input.caption}
        x={32}
        y={124}
        width={896}
        fontSize={12}
        maxLines={1}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
