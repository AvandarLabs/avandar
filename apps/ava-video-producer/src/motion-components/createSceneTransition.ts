import { linearTiming } from "@remotion/transitions";
import { getMotionDuration, getMotionEasing } from "./motionSettings";
import { SceneTransition } from "./SceneTransition";
import type { SceneTransitionProps } from "./getSceneTransitionStyle";
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
export function createSceneTransition({
  durationInFrames,
  ...props
}: SceneTransitionProps & {
  durationInFrames: number;
}): SceneTransitionSpec {
  const duration = getMotionDuration(durationInFrames, props.motion);
  if (duration < 1 || props.kind === "cut") {
    throw new Error("Cuts use adjacent sequences without a Transition element");
  }
  return {
    timing: linearTiming({
      durationInFrames: duration,
      easing: getMotionEasing(props.motion),
    }),
    presentation: { component: SceneTransition, props },
  };
}
