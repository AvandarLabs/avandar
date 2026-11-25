import { Motion } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g
      opacity={Motion.ramp({
        frame,
        at: completeAt,
        dur: motion.whip,
        easing: motion.reveal.easing,
      })}
    >
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
