import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../SharedExperimentPredictions.schema.ts";

/** Values needed to derive this visual's layout and appearance. */
type Options = { input: Input; frame: number; accent: string };

/** Layout and appearance values returned for the current frame. */
type Presentation = {
  input: Options["input"];
  frame: Options["frame"];
  accent: Options["accent"];
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  descent: number;
  roll: number;
  observedX: number;
  ballX: number;
};

/**
 * Returns descent, roll, and observed ball position with theme values for
 * `ExperimentTrack`, `ExperimentTrackPanel`.
 */
export function useExperimentTrackPresentation({
  input,
  frame,
  accent,
}: Readonly<Options>): Presentation {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const descent = motion.ramp(
    frame,
    76,
    motion.scale(10),
    motion.travel.easing,
  );
  const roll = motion.ramp(frame, 86, motion.scale(22), motion.travel.easing);
  const observedX =
    450 + (430 * input.observationDistance) / input.track.maximum;
  const ballX =
    frame < 86
      ? Motion.mix({ t: descent, from: 405, to: 450 })
      : Motion.mix({ t: roll, from: 450, to: observedX });
  return {
    input,
    frame,
    accent,
    atomic,
    tokens,
    scales,
    descent,
    roll,
    observedX,
    ballX,
  };
}
