import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./PriorityInsertion.schema";
import type { ReactNode } from "react";

type ParentProps = GraphicProps & {
  input: Input;
};

type Props = {
  frame: Readonly<ParentProps>["frame"];
  input: Readonly<ParentProps>["input"];
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  insertionY: number;
};

/** Renders the priority bracket in authored paint order. */
export function PriorityBracket(options: Readonly<Props>): ReactNode {
  return (
    <g
      opacity={options.motion.ramp(options.frame, 38, options.motion.scale(26))}
    >
      <SketchedShape
        shape={{ kind: "path", d: `M760 300 V${options.insertionY + 24} H460` }}
        profile={options.tokens.sketch.shape}
        stroke={options.tokens.color.highlight}
        fill="none"
        strokeDasharray={options.atomic.dash.open.join(" ")}
      />
      <FitText
        text={options.input.priorityLabel}
        x={590}
        y={100}
        width={340}
        fontSize={18}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
        color={options.tokens.color.highlight}
      />
    </g>
  );
}
