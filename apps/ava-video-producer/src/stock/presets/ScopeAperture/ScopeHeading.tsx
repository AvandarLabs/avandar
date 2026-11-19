import { FitText } from "../../primitives/FitText/FitText";
import { useGraphicMotion } from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Props } from "./ScopeAperture";
import type { ReactNode } from "react";
/** The broad subject stays visible until the focused question replaces it. */
export function ScopeHeading({ frame, input }: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  return (
    <>
      <g
        opacity={
          motion.reveal(frame, 12) *
          (1 - motion.ramp(frame, 72, motion.scale(24)))
        }
      >
        <FitText
          text={input.broadTopic}
          x={480}
          y={50}
          width={840}
          fontSize={24}
          maxLines={3}
          anchor="middle"
          breakLongWords
          normalizeWhitespace
        />
      </g>
    </>
  );
}
