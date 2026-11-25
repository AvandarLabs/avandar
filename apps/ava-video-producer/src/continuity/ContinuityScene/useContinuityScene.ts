import { useCurrentFrame } from "remotion";
import { MotionSettings } from "../../motion-components/MotionSettings/MotionSettings";
import { useVideoShapeScales } from "../../videoTheme/useVideoShapeScales";
import {
  useVideoProps,
  useVideoTokens,
} from "../../videoTheme/videoThemeHelpers";
import { ContinuityTimeline } from "../ContinuityTimeline/ContinuityTimeline";
import type { ResolvedVideoComponents } from "../../videoTheme/videoTheme.types";
import type { ContinuityPlan } from "../continuitySchema/continuitySchema";
/** Theme samples and timeline values consumed by continuity scene regions. */
type ContinuitySceneState = {
  parentFrame: number;
  color: ReturnType<typeof useVideoTokens>["color"];
  settings: ReturnType<typeof MotionSettings.useMotionSettingsTheme>;
  evidenceChip: { borderRadius: number };
  bar: ResolvedVideoComponents["ProgressBar"];
  morph: ResolvedVideoComponents["Morph"];
  aperture: ResolvedVideoComponents["Aperture"];
  duration: number;
};
/** Read the scene theme and timing with stable hook order. */
export function useContinuityScene({
  plan,
}: Readonly<{ plan: ContinuityPlan }>): ContinuitySceneState {
  const parentFrame = useCurrentFrame();
  const tokens = useVideoTokens();
  const { color } = tokens;
  const scales = useVideoShapeScales();
  const settings = MotionSettings.useMotionSettingsTheme();
  const evidenceChip = { borderRadius: scales.corner(tokens.corner.chip) };
  const bar = useVideoProps({
    name: "ProgressBar",
    props: {},
  });
  const morph = useVideoProps({
    name: "Morph",
    props: {},
  });
  const aperture = useVideoProps({
    name: "Aperture",
    props: {},
  });
  const timing = ContinuityTimeline.getContinuityTimeline(plan.beats);
  const duration = timing[timing.length - 1].end;
  return {
    parentFrame,
    color,
    settings,
    evidenceChip,
    bar,
    morph,
    aperture,
    duration,
  };
}
