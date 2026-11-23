import { Motion } from "../../../../motion";
import { FitText } from "../../../primitives/FitText/FitText";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { RightSourceAndKeyHeadings } from "./RightSourceAndKeyHeadings";
import type { Input } from "../KeyedRowZipper.schema";
import type { ReactNode } from "react";

/** Inputs for JoinSourceHeadings. */
type Props = {
  frame: number;
  input: Input;
};

/** Source headings identify the values and the facing key cells. */
export function JoinSourceHeadings({
  frame,
  input,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g
      opacity={
        1 -
        Motion.ramp({
          frame,
          at: 90,
          dur: motion.hero,
          easing: motion.exit.easing,
        })
      }
    >
      <FitText
        text={input.labels.left}
        x={44}
        y={110}
        width={390}
        fontSize={14}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      <RightSourceAndKeyHeadings input={input} />
    </g>
  );
}
