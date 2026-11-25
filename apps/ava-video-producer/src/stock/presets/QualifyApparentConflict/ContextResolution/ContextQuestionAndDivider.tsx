import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { ContextQuestion } from "../ContextQuestion";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Props as ParentProps } from "../QualifyApparentConflict";
import type { ReactNode } from "react";

type Props = {
  frame: Readonly<ParentProps>["frame"];
  accent: Readonly<ParentProps>["accent"];
  input: Readonly<ParentProps>["input"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  split: number;
  dividerOpacity: number;
};

/** Renders the context question and divider in authored paint order. */
export function ContextQuestionAndDivider(options: Readonly<Props>): ReactNode {
  return (
    <>
      <ContextQuestion
        {...{
          frame: options.frame,
          input: options.input,
          accent: options.accent,
          id: "question",
        }}
      />
      <SketchedShape
        shape={{
          kind: "line",
          x1: 480,
          y1: Motion.mix({
            t: options.split,
            from: 270,
            to: 130,
          }),
          x2: 480,
          y2: Motion.mix({
            t: options.split,
            from: 270,
            to: 410,
          }),
        }}
        profile={options.tokens.sketch.shape}
        data-context-divider="true"
        stroke={options.tokens.color.line}
        strokeWidth={options.scales.stroke(options.tokens.stroke.default)}
        opacity={options.dividerOpacity}
      />
    </>
  );
}
