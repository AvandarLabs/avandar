import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { DuplicateTiming } from "../DuplicateTiming";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../DuplicateReviewStack.schema";
import type { ReactNode } from "react";

type ParentProps = {
  frame: number;
  input: Input;
  group: Input["groups"][number];
  x: number;
  y: number;
  isPair: boolean;
  progress: number;
  accent: string;
};

type Props = {
  frame: Readonly<ParentProps>["frame"];
  group: Readonly<ParentProps>["group"];
  x: Readonly<ParentProps>["x"];
  y: Readonly<ParentProps>["y"];
  isPair: Readonly<ParentProps>["isPair"];
  progress: Readonly<ParentProps>["progress"];
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};

/**
 * Renders the duplicate group heading comparison ruler in authored paint order.
 */
export function DuplicateGroupHeadingComparisonRuler(
  options: Readonly<Props>,
): ReactNode {
  return (
    <g data-comparison-ruler={options.group.id}>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${options.x + 4} ${options.y}v${options.isPair ? 112 : 360}`,
        }}
        profile={options.tokens.sketch.shape}
        fill="none"
        stroke={options.accent}
        opacity={
          Motion.ramp({
            frame: options.frame,
            at: DuplicateTiming.ALIGN_CUE,
            dur: DuplicateTiming.FOLD_CUE - DuplicateTiming.ALIGN_CUE,
            easing: options.motion.reveal.easing,
          }) *
          (1 - options.progress)
        }
      />
    </g>
  );
}
