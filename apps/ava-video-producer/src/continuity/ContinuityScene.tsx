import { TransitionSeries } from "@remotion/transitions";
import { Fragment } from "react";
import { Sequence, useCurrentFrame } from "remotion";
import { createSceneTransition } from "../motion-components/createSceneTransition";
import { buildColorWithAlpha } from "../videoTheme/cssValueHelpers/cssValueHelpers";
import { useVideoProps, useVideoTokens } from "../videoTheme/useVideoTheme";
import { ContinuityAppearanceContext } from "./ContinuityAppearanceContext";
import { ContinuityBeatView } from "./ContinuityBeatView";
import css from "./ContinuityScene.module.css";
import { getContinuityTimeline } from "./continuityTimeline";
import { ContinuityToken } from "./ContinuityToken";
import type { ProductSceneRenderer } from "../storyboard/StoryFilm/ShotView";
import type { ContinuityPlan } from "./continuitySchema";
import type { ReactNode } from "react";

/**
 * Overlap-aware sequence of motions, product demonstrations and explanatory
 * composites, drawn in the surrounding video theme.
 */
export function ContinuityScene({
  plan,
  frame,
  productScene,
}: {
  plan: ContinuityPlan;
  frame: number;
  productScene?: ProductSceneRenderer;
}): ReactNode {
  const parentFrame = useCurrentFrame();
  const { color } = useVideoTokens();
  const bar = useVideoProps("ProgressBar", {});
  const morph = useVideoProps("Morph", {});
  const aperture = useVideoProps("Aperture", {});
  const timing = getContinuityTimeline(plan.beats);
  const duration = timing[timing.length - 1].end;
  return (
    <ContinuityAppearanceContext.Provider value={plan}>
      <div className={css.continuityStage}>
        <Sequence from={parentFrame - frame}>
          <TransitionSeries>
            {plan.beats.map((beat, index) => {
              return (
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
                        morphRadius: morph.startRadius,
                        apertureOverscan: aperture.overscan,
                      })}
                    />
                  )}
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
        <ContinuityToken plan={plan} frame={frame} />
        <div className={css.continuityEvidence}>
          <span>{plan.evidence}</span>
          <span>{plan.title}</span>
        </div>
        <div
          className={css.continuityProgress}
          style={{
            width: `${Math.min(1, frame / (duration - 1)) * 100}%`,
            height: bar.height,
            background: buildColorWithAlpha(bar.paint.color, bar.paint.alpha),
          }}
        />
      </div>
    </ContinuityAppearanceContext.Provider>
  );
}
