import { linearTiming } from "@remotion/transitions";
import type { SceneTransitionProps } from "./getSceneTransitionStyle";
import { MotionSettings } from "./MotionSettings/MotionSettings";
import { SceneTransition } from "./SceneTransition";
import type { MotionSettingsTheme } from "./MotionSettings/MotionSettings";
import type { TransitionTiming } from "@remotion/transitions";
/** The timing and presentation a `TransitionSeries.Transition` takes. */
type SceneTransitionSpec = {
  timing: TransitionTiming;
  presentation: {
    component: typeof SceneTransition;
    props: SceneTransitionProps;
  };
};
/**
 * Matching timing and presentation for TransitionSeries. Cuts need no
 * Transition element.
 */
export function makeSceneTransitionSpecFromProps({
  input: { durationInFrames, ...props },
  theme = MotionSettings.getClassicMotionSettingsTheme(),
}: Readonly<{
  input: SceneTransitionProps & {
    durationInFrames: number;
  };
  theme?: MotionSettingsTheme;
}>): SceneTransitionSpec {
  const duration = MotionSettings.getMotionDuration({
    frames: durationInFrames,
    options: props.motion,
    theme,
  });
  if (duration < 1 || props.kind === "cut") {
    throw new Error("Cuts use adjacent sequences without a Transition element");
  }
  return {
    timing: linearTiming({
      durationInFrames: duration,
      easing: MotionSettings.getMotionEasing({
        options: props.motion,
        fallback: undefined,
        theme,
      }),
    }),
    presentation: { component: SceneTransition, props },
  };
}
