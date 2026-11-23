import { MotionSettings } from "../../motion-components/MotionSettings/MotionSettings";
import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import { useVideoShapeScales } from "../../videoTheme/useVideoShapeScales";
import {
  useVideoProps,
  useVideoTokens,
} from "../../videoTheme/videoThemeHelpers";
import { getContinuityTokenSample } from "./getContinuityTokenSample";
import type { ContinuityPlan } from "../continuitySchema/continuitySchema";
import type { SampledContinuityToken } from "./ContinuityToken.types";
/**
 * Sample token motion with the original theme hook order and absent-token
 * guard.
 */
export function useContinuityToken({
  plan,
  frame,
}: Readonly<{
  plan: ContinuityPlan;
  frame: number;
}>): SampledContinuityToken | null {
  const tokens = useVideoTokens();
  const sharedObject = useVideoProps({
    name: "SharedObject",
    props: {},
  });
  const motion = useVideoMotion();
  const scales = useVideoShapeScales();
  const settings = MotionSettings.useMotionSettingsTheme();
  return getContinuityTokenSample({
    plan,
    frame,
    motion,
    scales,
    tokens,
    sharedObject,
    settings,
  });
}
