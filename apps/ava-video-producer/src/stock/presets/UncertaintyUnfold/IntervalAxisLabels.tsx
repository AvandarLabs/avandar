import { FitText } from "../../primitives/FitText/FitText";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./UncertaintyUnfold.schema";
import type { ReactNode } from "react";

type ParentProps = GraphicProps & {
  input: Input;
};

type Props = {
  input: Readonly<ParentProps>["input"];
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  unfold: number;
};

/** Renders the interval axis labels in authored paint order. */
export function IntervalAxisLabels(options: Readonly<Props>): ReactNode {
  return (
    <g opacity={options.unfold}>
      <FitText
        text={options.input.axis.unit}
        x={480}
        y={430}
        width={760}
        fontSize={14}
        maxLines={1}
        anchor="middle"
        breakLongWords
        normalizeWhitespace
        color={options.tokens.color.textMuted}
      />
      <FitText
        text={options.input.interval.label}
        x={100}
        y={466}
        width={760}
        fontSize={18}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
        color={options.accent}
      />
    </g>
  );
}
