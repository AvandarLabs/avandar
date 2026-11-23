import { Motion } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./ArgumentBridge.schema";
import type { ReactNode } from "react";

/** Complete authored reasons and conclusion. */
export type ParentProps = GraphicProps & {
  input: Input;
};

type Props = {
  frame: Readonly<ParentProps>["frame"];
  input: Readonly<ParentProps>["input"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};

/** Renders the premise heading in authored paint order. */
export function PremiseHeading(options: Readonly<Props>): ReactNode {
  return (
    <g
      opacity={Motion.ramp({
        frame: options.frame,
        at: 12,
        dur: options.motion.hero,
        easing: options.motion.reveal.easing,
      })}
    >
      <FitText
        text={options.input.premiseHeading}
        x={480}
        y={54}
        width={840}
        fontSize={18}
        maxLines={3}
        anchor="middle"
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
