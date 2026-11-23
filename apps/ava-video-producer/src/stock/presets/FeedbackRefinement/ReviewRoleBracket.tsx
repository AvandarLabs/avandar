import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./FeedbackRefinement.schema";
import type { ReactNode } from "react";

type ParentProps = GraphicProps & {
  input: Input;
};

type Props = {
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  label: Array<
    | Readonly<ParentProps>["input"]["roleLabels"]["author"]
    | Readonly<ParentProps>["input"]["roleLabels"]["reviewer"]
  >[number];
  index: number;
};

/** Renders the review role bracket in authored paint order. */
export function ReviewRoleBracket(options: Readonly<Props>): ReactNode {
  return (
    <g key={options.index}>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${100 + 460 * options.index} 188 V174 H${400 + 460 * options.index} V188`,
        }}
        profile={options.tokens.sketch.shape}
        fill="none"
        stroke={options.tokens.color.line}
      />
      <FitText
        text={options.label}
        x={250 + 460 * options.index}
        y={140}
        width={300}
        fontSize={16}
        maxLines={2}
        anchor="middle"
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
