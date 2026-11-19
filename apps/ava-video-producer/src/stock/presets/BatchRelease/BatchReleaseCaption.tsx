import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  completeAt: number;
  x: number;
  y: number;
  text: string;
};
/** The completion caption follows its own released envelope. */
export function BatchReleaseCaption({
  frame,
  completeAt,
  x,
  y,
  text,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  return (
    <g opacity={ramp(frame, completeAt, motion.whip, motion.reveal.easing)}>
      <FitText
        text={text}
        x={x + 15}
        y={y + 154}
        width={330}
        fontSize={14}
        maxLines={2}
        normalizeWhitespace
        breakLongWords
        color={tokens.color.textMuted}
      />
    </g>
  );
}
