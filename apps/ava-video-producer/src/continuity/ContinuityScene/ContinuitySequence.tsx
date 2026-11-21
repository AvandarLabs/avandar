import { TransitionSeries } from "@remotion/transitions";
import { Fragment } from "react";
import { Sequence } from "remotion";
import { ContinuityBeatView } from "../ContinuityBeatView/ContinuityBeatView";
import { getContinuityBeatTransition } from "./getContinuityBeatTransition";
import type { ProductSceneRenderer } from "../../storyboard/StoryFilm/ShotView";
import type { ContinuityPlan } from "../continuitySchema/continuitySchema";
import type { useContinuityScene } from "./useContinuityScene";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useContinuityScene>,
  "parentFrame" | "color" | "settings" | "morph" | "aperture"
> & {
  plan: ContinuityPlan;
  frame: number;
  productScene?: ProductSceneRenderer;
};
/**
 * Sequence overlapping beats while retaining their authored transition keys.
 */
export function ContinuitySequence({
  plan,
  frame,
  productScene,
  parentFrame,
  color,
  settings,
  morph,
  aperture,
}: Readonly<Props>): ReactNode {
  return (
    <Sequence from={parentFrame - frame}>
      <TransitionSeries>
        {plan.beats.map((beat, index) => {
          return (
            <Fragment key={beat.id}>
              {index > 0 && beat.transition.frames > 0 ? (
                <TransitionSeries.Transition
                  {...getContinuityBeatTransition({
                    beat,
                    index,
                    plan,
                    settings,
                    morph,
                    aperture,
                  })}
                />
              ) : null}
              <TransitionSeries.Sequence
                durationInFrames={beat.duration}
                name={beat.id}
              >
                <ContinuityBeatView
                  beat={beat}
                  accent={color.accent}
                  productScene={productScene}
                />
              </TransitionSeries.Sequence>
            </Fragment>
          );
        })}
      </TransitionSeries>
    </Sequence>
  );
}
