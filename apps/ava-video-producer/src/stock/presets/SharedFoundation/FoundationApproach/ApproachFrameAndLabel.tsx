import { FitText } from "../../../primitives/FitText/FitText";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { ApproachTrait } from "../ApproachTrait";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../SharedFoundation.schema";
import type { ReactNode } from "react";

type ParentProps = {
  frame: number;
  accent: string;
  approach: Input["approaches"][number];
  index: number;
  showTrait: boolean;
};

type Props = {
  frame: Readonly<ParentProps>["frame"];
  accent: Readonly<ParentProps>["accent"];
  approach: Readonly<ParentProps>["approach"];
  index: Readonly<ParentProps>["index"];
  showTrait: Readonly<ParentProps>["showTrait"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  x: number;
};

/** Renders the approach frame and label in authored paint order. */
export function ApproachFrameAndLabel(options: Readonly<Props>): ReactNode {
  return (
    <>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${options.x} 370 V180 H${options.x + 360} V370 Z`,
        }}
        profile={options.tokens.sketch.shape}
        stroke={options.index ? options.tokens.color.positive : options.accent}
        fill={options.tokens.color.surface}
        strokeWidth={options.scales.stroke(options.tokens.stroke.default)}
      />
      <FitText
        text={options.approach.label}
        x={options.x + 180}
        y={220}
        width={320}
        fontSize={20}
        maxLines={3}
        anchor="middle"
        breakLongWords
        normalizeWhitespace
      />
      <ApproachTrait
        {...{
          frame: options.frame,
          approach: options.approach,
          index: options.index,
          x: options.x,
          showTrait: options.showTrait,
        }}
      />
    </>
  );
}
