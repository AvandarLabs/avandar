import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import {
  DEMONSTRATE_CUE,
  HANDOFF_CUE,
  SECOND_DEMONSTRATION_CUE,
} from "../exchangeTiming";
import { ExpertiseWorktableContent } from "./ExpertiseWorktableContent";
import type { Input } from "../ExpertiseRoleExchange.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  frame: number;
  accent: string;
  toolX: number;
};

type ToolWidthOptions = {
  input: Readonly<Props>["input"];
  frame: Readonly<Props>["frame"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};

type ToolWidthResult = {
  toolWidth: number;
  topic: Readonly<Props>["input"]["topics"][number];
  demonstration: number;
};

/** Frames each demonstration takes to fold or measure. */
const DEMONSTRATION_FRAMES = 22;

/**
 * Samples the expertise worktable tool width state for the current authored
 * frame.
 */
function _getExpertiseWorktableToolWidthState({
  input,
  frame,
  tokens,
  scales,
  motion,
}: Readonly<ToolWidthOptions>): ToolWidthResult {
  const toolWidth = scales.stroke(tokens.stroke.default);
  const isFirst = frame < HANDOFF_CUE;
  const topic = input.topics[isFirst ? 0 : 1];
  const demonstration = Motion.ramp({
    frame,
    at: isFirst ? DEMONSTRATE_CUE : SECOND_DEMONSTRATION_CUE,
    dur: motion.scale(DEMONSTRATION_FRAMES),
    easing: motion.entrance.easing,
  });
  return { toolWidth, topic, demonstration };
}

/**
 * A shared table supports a visibly handled folding guide or alignment ruler.
 */
export function ExpertiseWorktable({
  input,
  frame,
  accent,
  toolX,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { toolWidth, topic, demonstration } =
    _getExpertiseWorktableToolWidthState({
      input,
      frame,
      tokens,
      scales,
      motion,
    });
  return (
    <ExpertiseWorktableContent
      frame={frame}
      accent={accent}
      toolX={toolX}
      tokens={tokens}
      scales={scales}
      motion={motion}
      toolWidth={toolWidth}
      topic={topic}
      demonstration={demonstration}
    />
  );
}
