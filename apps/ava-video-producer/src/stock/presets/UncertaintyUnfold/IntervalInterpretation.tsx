import { FitText } from "../../primitives/FitText/FitText";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./UncertaintyUnfold.schema";
import type { ReactNode } from "react";

type ParentProps = GraphicProps & {
  input: Input;
};

type Props = {
  frame: Readonly<ParentProps>["frame"];
  input: Readonly<ParentProps>["input"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};

/** Renders the interval interpretation in authored paint order. */
export function IntervalInterpretation(options: Readonly<Props>): ReactNode {
  return (
    <g opacity={options.motion.reveal(options.frame, 108)}>
      <FitText
        text={options.input.interpretation}
        x={100}
        y={540}
        width={760}
        fontSize={14}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
