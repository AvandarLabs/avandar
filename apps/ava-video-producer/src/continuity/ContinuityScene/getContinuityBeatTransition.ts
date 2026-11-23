import { makeSceneTransitionSpecFromProps } from "../../motion-components/makeSceneTransitionSpecFromProps";
import type {
  ContinuityBeat,
  ContinuityPlan,
} from "../continuitySchema/continuitySchema";
import type { useContinuityScene } from "./useContinuityScene";

type Options = Pick<
  ReturnType<typeof useContinuityScene>,
  "settings" | "morph" | "aperture"
> & {
  beat: ContinuityBeat;
  index: number;
  plan: ContinuityPlan;
};
/** Map an authored beat and theme to the Remotion transition contract. */
export function getContinuityBeatTransition({
  beat,
  index,
  plan,
  settings,
  morph,
  aperture,
}: Readonly<Options>): ReturnType<typeof makeSceneTransitionSpecFromProps> {
  return makeSceneTransitionSpecFromProps({
    input: {
      durationInFrames: beat.transition.frames,
      kind: beat.transition.kind,
      motion: beat.transition.motion,
      origin: beat.transition.origin,
      anchor: plan.beats[index - 1]?.token?.anchor,
      cameraMotion: plan.cameraMotion,
      motionBlur: plan.motionBlur,
      morphRadius: morph.startRadius,
      apertureOverscan: aperture.overscan,
    },
    theme: settings,
  });
}
