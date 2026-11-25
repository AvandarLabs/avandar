import { SketchedShape } from "../../primitives/SketchedShape";
import { RehearsalRuler } from "./RehearsalRuler";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getRehearsalStateFromInputAndFrame } from "./getRehearsalStateFromInputAndFrame";
import type { Input } from "./LinkedParameterRehearsal.schema";
import type { ReactNode } from "react";

type ParentProps = GraphicProps & {
  input: Input;
};

type Props = {
  input: Readonly<ParentProps>["input"];
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  value: ReturnType<typeof getRehearsalStateFromInputAndFrame>["value"];
  baselineX: number;
};

/** Renders the source ruler and baseline in authored paint order. */
export function SourceRulerAndBaseline(options: Readonly<Props>): ReactNode {
  return (
    <>
      <RehearsalRuler
        label={options.input.source.label}
        unit={options.input.source.unit}
        min={options.input.source.min}
        max={options.input.source.max}
        value={options.value}
        y={170}
      />
      {options.input.showBaselineMarkers ? (
        <SketchedShape
          shape={{ kind: "circle", cx: options.baselineX, cy: 170, r: 10 }}
          profile={options.tokens.sketch.shape}
          fill="none"
          stroke={options.accent}
          strokeOpacity={options.tokens.alpha.guide}
        />
      ) : undefined}
    </>
  );
}
