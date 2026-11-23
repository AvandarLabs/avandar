import { SketchedShape } from "../../primitives/SketchedShape";
import { UncertaintyAxis } from "./UncertaintyAxis/UncertaintyAxis";
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
  patternId: string;
};

/** Renders the uncertainty unfolddefs in authored paint order. */
export function IntervalPatternDefinition(options: Readonly<Props>): ReactNode {
  return (
    <>
      <defs>
        <pattern
          id={options.patternId}
          width={10}
          height={10}
          patternUnits="userSpaceOnUse"
        >
          <SketchedShape
            shape={{ kind: "path", d: "M-2 2 L2 -2 M0 10 L10 0 M8 12 L12 8" }}
            profile={options.tokens.sketch.shape}
            stroke={options.accent}
            strokeOpacity={options.tokens.alpha.guide}
          />
        </pattern>
      </defs>
      <UncertaintyAxis input={options.input} />
    </>
  );
}
