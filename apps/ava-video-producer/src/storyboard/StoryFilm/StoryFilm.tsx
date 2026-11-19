import { AbsoluteFill, useCurrentFrame } from "remotion";
import {
  HorizontalBlurFilter,
  getHorizontalBlurFilter,
} from "../../motion-components/HorizontalBlur";
import { CaptionOverlay } from "../../scenes/CaptionOverlay";
import { captionBand } from "../../scenes/layout/layout";
import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import { useVideoTokens } from "../../videoTheme/useVideoTheme";
import { VideoThemeScope } from "../../videoTheme/VideoThemeScope/VideoThemeScope";
import {
  absoluteCues,
  durationInFrames,
  timeline,
  type Storyboard,
} from "../schema/schema";
import { createThemePatchesFromTheme } from "./createThemePatchFromTheme";
import { getShotTransitionLayers } from "./getShotTransitionLayers";
import { ShotView, type ProductSceneRenderer } from "./ShotView";
import type { CSSProperties, ReactNode } from "react";

export type { ProductSceneRenderer } from "./ShotView";

const OUTGOING_BLUR_ID = "story-film-outgoing-blur";

type Props = {
  plan: Storyboard;
  productScene?: ProductSceneRenderer;
  showCaptions?: boolean;
};

/**
 * Plays a storyboard: each shot over the previous one through its shot
 * transition (a dissolve by default, a stepped column wipe, or a hard cut),
 * with each shot's own theme tokens layered over the plan theme.
 */
export function StoryFilm(props: Props): ReactNode {
  const frame = useCurrentFrame();
  return <StoryFilmPicture {...props} frame={frame} />;
}

/**
 * One frame of `StoryFilm`. The plan theme and each shot theme patch the
 * scene palette of the surrounding video theme (`classic` outside any
 * provider), so a shot's field colours can name theme swatches.
 */
export function StoryFilmPicture({
  plan,
  ...props
}: Props & { frame: number }): ReactNode {
  return (
    <VideoThemeScope
      patches={createThemePatchesFromTheme(plan.theme)}
      element="div"
    >
      <_Film plan={plan} {...props} />
    </VideoThemeScope>
  );
}

function _Film({
  plan,
  productScene,
  showCaptions = true,
  frame,
}: Props & { frame: number }): ReactNode {
  const motion = useVideoMotion();
  const tokens = useVideoTokens();
  const shots = timeline(plan);
  const index = Math.max(
    0,
    shots.findIndex((shot) => {
      return frame >= shot.startFrame && frame < shot.endFrame;
    }),
  );
  const shot = shots[index];
  const localFrame = frame - shot.startFrame;
  const previous = index > 0 ? shots[index - 1] : undefined;
  const layers = getShotTransitionLayers({
    transition: shot.transition,
    transitionInFrames: shot.transitionInFrames,
    previousDurationInFrames: previous?.durationInFrames,
    localFrame,
    width: plan.width,
    motion,
  });
  const total = durationInFrames(plan);
  // Reserve a stable caption band rather than placing text over scene content.
  const sceneHeight =
    plan.height -
    (plan.captions ? captionBand(plan.narration, plan.width, plan.height) : 0);
  const loopFade = motion.loopFade.film;
  const loopOut =
    plan.purpose === "loop"
      ? 1 - motion.ramp(frame, total - loopFade, loopFade, motion.dissolve.easing)
      : 1;
  const common = { width: plan.width, height: sceneHeight, productScene };
  return (
    <AbsoluteFill style={{ background: tokens.color.scene.ground }}>
      <AbsoluteFill style={{ opacity: loopOut }}>
        {previous && layers.outgoing ? (
          <>
            <HorizontalBlurFilter
              id={OUTGOING_BLUR_ID}
              amount={layers.outgoing.blurX}
            />
            <_ShotLayer
              {...common}
              shot={previous}
              frame={layers.outgoing.frame}
              style={{
                transform: `translateX(${layers.outgoing.offsetX.toFixed(2)}px)`,
                filter: getHorizontalBlurFilter(
                  OUTGOING_BLUR_ID,
                  layers.outgoing.blurX,
                ),
              }}
            />
          </>
        ) : null}
        <_ShotLayer
          {...common}
          shot={shot}
          frame={localFrame}
          style={layers.incoming}
        />
        {plan.captions && showCaptions ? (
          <CaptionOverlay
            frame={frame}
            cues={absoluteCues(plan)}
            width={plan.width}
            height={plan.height}
          />
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

type ShotLayerProps = {
  shot: Storyboard["shots"][number];
  frame: number;
  width: number;
  height: number;
  productScene?: ProductSceneRenderer;
  style: CSSProperties;
};

/** One opaque shot, painted on its own theme's ground. */
function _ShotLayer(props: ShotLayerProps) {
  return (
    <VideoThemeScope
      patches={createThemePatchesFromTheme(props.shot.theme)}
      element="div"
    >
      <_ShotSurface {...props} />
    </VideoThemeScope>
  );
}

function _ShotSurface({
  shot,
  frame,
  width,
  height,
  productScene,
  style,
}: ShotLayerProps) {
  const tokens = useVideoTokens();
  return (
    <AbsoluteFill
      style={{ background: tokens.color.scene.ground, ...style }}
    >
      <ShotView
        shot={shot}
        frame={frame}
        width={width}
        height={height}
        productScene={productScene}
      />
    </AbsoluteFill>
  );
}
