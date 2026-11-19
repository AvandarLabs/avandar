import { FitText } from "../../primitives/FitText/FitText";
import { useGraphicMotion } from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Props } from "./ScopeAperture";
import type { ReactNode } from "react";
/**
 * The narrower question and boundary label appear within the final aperture.
 */
export function FocusedQuestion({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  return (
    <>
      <g
        data-focused-question="true"
        opacity={motion.ramp(frame, 84, motion.scale(24))}
      >
        <FitText
          text={input.focusedQuestion}
          x={480}
          y={198}
          width={420}
          fontSize={20}
          maxLines={4}
          anchor="middle"
          breakLongWords
          normalizeWhitespace
        />
      </g>
      <g opacity={motion.reveal(frame, 96)}>
        <FitText
          text={input.insideLabel}
          x={480}
          y={138}
          width={430}
          fontSize={14}
          maxLines={1}
          anchor="middle"
          color={accent}
          breakLongWords
          normalizeWhitespace
        />
      </g>
    </>
  );
}
