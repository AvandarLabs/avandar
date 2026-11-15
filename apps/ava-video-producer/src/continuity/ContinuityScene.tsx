import { TransitionSeries } from "@remotion/transitions";
import { Fragment } from "react";
import { Sequence, useCurrentFrame } from "remotion";
import { createSceneTransition } from "../motion-components/SceneTransition";
import {
  ContinuityAppearanceContext,
  getEditorialInk,
} from "./ContinuityAppearanceContext";
import { ContinuityBeatView } from "./ContinuityBeatView";
import css from "./ContinuityScene.module.css";
import { getContinuityTimeline } from "./continuityTimeline";
import { ContinuityToken } from "./ContinuityToken";
import { useContinuityCopy } from "./useContinuityCopy";
import type { ProductSceneRenderer } from "../storyboard/StoryFilm/ShotView";
import type { ContinuityPlan } from "./continuitySchema";
import type { CSSProperties } from "react";

/** Overlap-aware sequence of motions, product demonstrations and explanatory composites. */
export function ContinuityScene({
  plan,
  frame,
  productScene,
}: {
  plan: ContinuityPlan;
  frame: number;
  productScene?: ProductSceneRenderer;
}) {
  const parentFrame = useCurrentFrame();
  const translate = useContinuityCopy();
  const timing = getContinuityTimeline(plan.beats);
  const duration = timing[timing.length - 1].end;
  return (
    <ContinuityAppearanceContext.Provider value={plan}>
      <div
        className={css.continuityStage}
        style={
          {
            "--continuity-ground": plan.background,
            "--continuity-ink": getEditorialInk(plan.background),
          } as CSSProperties
        }
      >
        <Sequence from={parentFrame - frame}>
          <TransitionSeries>
            {plan.beats.map((beat, index) => (
              <Fragment key={beat.id}>
                {index > 0 && beat.transition.frames > 0 && (
                  <TransitionSeries.Transition
                    {...createSceneTransition({
                      durationInFrames: beat.transition.frames,
                      kind: beat.transition.kind,
                      motion: beat.transition.motion,
                      origin: beat.transition.origin,
                      anchor: plan.beats[index - 1]?.token?.anchor,
                      cameraMotion: plan.cameraMotion,
                      motionBlur: plan.motionBlur,
                    })}
                  />
                )}
                <TransitionSeries.Sequence
                  durationInFrames={beat.duration}
                  name={beat.id}
                >
                  <ContinuityBeatView
                    beat={beat}
                    accent={plan.accent}
                    productScene={productScene}
                  />
                </TransitionSeries.Sequence>
              </Fragment>
            ))}
          </TransitionSeries>
        </Sequence>
        <ContinuityToken plan={plan} frame={frame} />
        <div className={css.continuityEvidence}>
          <span>{translate(plan.evidence)}</span>
          <span>{translate(plan.title)}</span>
        </div>
        <div
          className={css.continuityProgress}
          style={{
            width: `${Math.min(1, frame / (duration - 1)) * 100}%`,
            background: plan.accent,
          }}
        />
      </div>
    </ContinuityAppearanceContext.Provider>
  );
}
