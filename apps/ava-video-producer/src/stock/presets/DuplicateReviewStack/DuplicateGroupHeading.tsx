import { mix, ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { DuplicateDecisionLabels } from "./DuplicateDecisionLabels";
import { DuplicateTiming } from "./DuplicateTiming";
import type { Input } from "./DuplicateReviewStack.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  input: Input;
  group: Input["groups"][number];
  x: number;
  y: number;
  isPair: boolean;
  progress: number;
  accent: string;
};
/** Comparison rulers and headings track the actual candidate group frame. */
export function DuplicateGroupHeading({
  frame,
  input,
  group,
  x,
  y,
  isPair,
  progress,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${x - 6} ${y - 65}v-8h${mix(isPair ? progress : 0, 432, 904)}v8`,
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.line}
      />
      <FitText
        text={group.label}
        x={x}
        y={y - 50}
        width={416}
        fontSize={14}
        maxLines={1}
        breakLongWords
        normalizeWhitespace
      />
      <DuplicateDecisionLabels
        frame={frame}
        labels={input.labels}
        isResolved={group.retainedId !== null}
        x={x}
        y={y}
        isPair={isPair}
        progress={progress}
      />
      <g data-comparison-ruler={group.id}>
        <SketchedShape
          shape={{ kind: "path", d: `M${x + 4} ${y}v${isPair ? 112 : 360}` }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={accent}
          opacity={
            ramp(
              frame,
              DuplicateTiming.ALIGN_CUE,
              DuplicateTiming.FOLD_CUE - DuplicateTiming.ALIGN_CUE,
              motion.reveal.easing,
            ) *
            (1 - progress)
          }
        />
      </g>
    </g>
  );
}
