import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { SEPARATE_CUE, SEPARATE_FRAMES } from "../getSeparationFromFrame";
import { getSpliceGeometryFromInputAndFrame } from "../getSpliceGeometryFromInputAndFrame";
import type { Input } from "../PipelineStepSplice.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = { input: Input; frame: number; accent: string };
/** Frames the new joints take to close around the inserted step. */
const CLOSE_FRAMES = 16;

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  input: Options["input"];
  frame: Options["frame"];
  accent: Options["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  steps: ReturnType<typeof getSpliceGeometryFromInputAndFrame>;
  fade: number;
  originalSteps: ReturnType<typeof getSpliceGeometryFromInputAndFrame>;
  closing: number;
};

/**
 * Returns pipeline steps, fade, and closing progress with theme values for
 * `PipelineStrip`, `OriginalPipelineJoints`.
 */
export function usePipelineStripPresentation({
  input,
  frame,
  accent,
}: Readonly<Options>): Presentation {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const steps = getSpliceGeometryFromInputAndFrame({ input, frame, motion });
  // The original joints fade out while the steps separate.
  const fade = Motion.ramp({
    frame,
    at: SEPARATE_CUE,
    dur: motion.scale(SEPARATE_FRAMES),
    easing: motion.exit.easing,
  });
  const originalSteps = steps.filter((step) => {
    return !step.isInserted;
  });
  const closing = Motion.ramp({
    frame,
    at: 82,
    dur: motion.scale(CLOSE_FRAMES),
    easing: motion.reveal.easing,
  });
  return {
    input,
    frame,
    accent,
    tokens,
    scales,
    steps,
    fade,
    originalSteps,
    closing,
  };
}
