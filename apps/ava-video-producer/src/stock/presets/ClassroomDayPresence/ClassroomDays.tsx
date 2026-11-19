import { Text } from "../../graphics-common/Text";
import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./ClassroomDayPresence.schema";
import type { ReactNode } from "react";
/** Inputs for ClassroomDays. */
type Props = { input: Input; activeIndex: number };

/** Numbered authored days provide the visible key for every desk impression. */
export function ClassroomDays({
  input,
  activeIndex,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <g>
      {input.days.map((day, index) => {
        return (
          <g key={day.id}>
            <Text
              x={32 + index * 310}
              y={32}
              role="secondary"
              fill={tokens.color.textMuted}
            >
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
            <SketchedShape
              shape={{
                kind: "path",
                d: `M ${32 + index * 310} 90 H ${308 + index * 310}`,
              }}
              profile={tokens.sketch.shape}
              stroke={
                index === activeIndex
                  ? tokens.color.accentAlt
                  : tokens.color.line
              }
              strokeWidth={index === activeIndex ? 3 : 1}
            />
          </g>
        );
      })}
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
