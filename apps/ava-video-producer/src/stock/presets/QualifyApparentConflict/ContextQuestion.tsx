import { FitText } from "../../primitives/FitText/FitText";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Props } from "./QualifyApparentConflict";
import type { ReactNode } from "react";
/** The opening question holds between the two apparently conflicting claims. */
export function ContextQuestion({ frame, input }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const resolution = motion.ramp(frame, 96, motion.scale(24));
  return (
    <>
      <g
        opacity={
          motion.ramp(frame, 12, motion.hero) *
          (1 - motion.ramp(frame, 84, motion.hero))
        }
      >
        <FitText
          text={input.openingLabel}
          x={480}
          y={66}
          width={840}
          fontSize={20}
          maxLines={2}
          anchor="middle"
          breakLongWords
          normalizeWhitespace
        />
      </g>
      <text
        x={480}
        y={270}
        fill={tokens.text.graphic.mark.color}
        fontSize={tokens.text.graphic.mark.fontSize}
        fontFamily={tokens.text.graphic.mark.fontFamily}
        fontWeight={tokens.text.graphic.mark.fontWeight}
        textAnchor="middle"
        opacity={1 - resolution}
        aria-hidden="true"
      >
        ?
      </text>
    </>
  );
}
