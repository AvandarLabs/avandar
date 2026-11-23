import { MotionSettings } from "../../motion-components/MotionSettings/MotionSettings";
import { getContinuityTokenBeat } from "./getContinuityTokenBeat";
import { getContinuityTokenStyle } from "./getContinuityTokenStyle";
import type { useVideoMotion } from "../../videoTheme/useVideoMotion";
import type { useVideoShapeScales } from "../../videoTheme/useVideoShapeScales";
import type { ResolvedVideoComponents } from "../../videoTheme/videoTheme.types";
import type { useVideoTokens } from "../../videoTheme/videoThemeHelpers";
import type { ContinuityPlan } from "../continuitySchema/continuitySchema";
import type { SampledContinuityToken } from "./ContinuityToken.types";

type Options = {
  plan: ContinuityPlan;
  frame: number;
  motion: ReturnType<typeof useVideoMotion>;
  scales: ReturnType<typeof useVideoShapeScales>;
  tokens: ReturnType<typeof useVideoTokens>;
  sharedObject: ResolvedVideoComponents["SharedObject"];
  settings: ReturnType<typeof MotionSettings.useMotionSettingsTheme>;
};
/** Sample shared-object anchors, transition progress and themed visibility. */
export function getContinuityTokenSample({
  plan,
  frame,
  motion,
  scales,
  tokens,
  sharedObject,
  settings,
}: Readonly<Options>): SampledContinuityToken | null {
  const { beat, timing, index } = getContinuityTokenBeat({ plan, frame });
  if (!beat.token) {
    return null;
  }
  const previous = plan.beats[index - 1]?.token;
  const progress = MotionSettings.getMotionProgress({
    frame,
    at: timing[index].start,
    duration: Math.max(1, beat.transition.frames),
    options: beat.transition.motion,
    fallback: undefined,
    theme: settings,
  });
  const destination = beat.token.anchor;
  const source =
    previous?.label === beat.token.label ? previous.anchor : destination;
  return {
    beat,
    token: beat.token,
    source,
    destination,
    at: timing[index].start,
    progress,
    style: getContinuityTokenStyle({
      frame,
      at: timing[index].start,
      appearance: beat.token.appearance,
      motion,
      scales,
      tokens,
      sharedObject,
    }),
  };
}
