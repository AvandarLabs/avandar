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
import {
  getShotTransitionLayers,
  type OutgoingShotLayer,
} from "./getShotTransitionLayers";
import { ShotView, type ProductSceneRenderer } from "./ShotView";
import type { VideoMotion } from "../../videoTheme/createVideoMotion/createVideoMotion";
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
      <FilmFrame plan={plan} {...props} />
    </VideoThemeScope>
  );
}

/** The shot playing at `frame`, and the one before it, if any. */
function _findShotsAtFrame(plan: Storyboard, frame: number) {
  const shots = timeline(plan);
  const index = Math.max(
    0,
    shots.findIndex((shot) => {
      return frame >= shot.startFrame && frame < shot.endFrame;
    }),
  );
  return {
    shot: shots[index],
    previous: index > 0 ? shots[index - 1] : undefined,
  };
}

/**
 * The shot playing at `frame`, the one before it, the shot's own frame, and
 * the transition layers between them.
 */
function _getShotLayersAtFrame(
  plan: Storyboard,
  frame: number,
  motion: VideoMotion,
) {
  const { shot, previous } = _findShotsAtFrame(plan, frame);
  const localFrame = frame - shot.startFrame;
  const layers = getShotTransitionLayers({
    transition: shot.transition,
    transitionInFrames: shot.transitionInFrames,
    previousDurationInFrames: previous?.durationInFrames,
    localFrame,
    width: plan.width,
    motion,
  });
  return { shot, previous, localFrame, layers };
}

/**
 * The height left for shots. A stable caption band is reserved rather than
 * placing text over scene content.
 */
function _getSceneHeight(plan: Storyboard): number {
  return (
    plan.height -
    (plan.captions ? captionBand(plan.narration, plan.width, plan.height) : 0)
  );
}

/**
 * A loop film's fade back to its ground over its last loop-fade frames. Other
 * films stay opaque.
 */
function _getLoopOutOpacity(
  plan: Storyboard,
  frame: number,
  motion: VideoMotion,
): number {
  if (plan.purpose !== "loop") {
    return 1;
  }
  const total = durationInFrames(plan);
  const loopFade = motion.loopFade.film;
  return (
    1 - motion.ramp(frame, total - loopFade, loopFade, motion.dissolve.easing)
  );
}

function FilmFrame({
  plan,
  productScene,
  showCaptions = true,
  frame,
}: Props & { frame: number }): ReactNode {
  const motion = useVideoMotion();
  const tokens = useVideoTokens();
  const { shot, previous, localFrame, layers } = _getShotLayersAtFrame(
    plan,
    frame,
    motion,
  );
  const loopOut = _getLoopOutOpacity(plan, frame, motion);
  const common = {
    width: plan.width,
    height: _getSceneHeight(plan),
    productScene,
  };
  return (
    <AbsoluteFill style={{ background: tokens.color.scene.ground }}>
      <AbsoluteFill style={{ opacity: loopOut }}>
        {previous && layers.outgoing ? (
          <_OutgoingShotLayer
            {...common}
            shot={previous}
            layer={layers.outgoing}
          />
        ) : null}
        <_ShotLayer
          {...common}
          shot={shot}
          frame={localFrame}
          style={layers.incoming}
        />
        {plan.captions && showCaptions ? (
          <_FilmCaptions plan={plan} frame={frame} />
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

function _FilmCaptions({ plan, frame }: { plan: Storyboard; frame: number }) {
  return (
    <CaptionOverlay
      frame={frame}
      cues={absoluteCues(plan)}
      width={plan.width}
      height={plan.height}
    />
  );
}

/** The outgoing shot, drifted and blurred by its transition layer. */
function _OutgoingShotLayer({
  layer,
  ...props
}: Omit<ShotLayerProps, "frame" | "style"> & { layer: OutgoingShotLayer }) {
  return (
    <>
      <HorizontalBlurFilter id={OUTGOING_BLUR_ID} amount={layer.blurX} />
      <_ShotLayer
        {...props}
        frame={layer.frame}
        style={{
          transform: `translateX(${layer.offsetX.toFixed(2)}px)`,
          filter: getHorizontalBlurFilter(OUTGOING_BLUR_ID, layer.blurX),
        }}
      />
    </>
  );
}

/** One opaque shot, painted on its own theme's ground. */
function _ShotLayer(props: ShotLayerProps) {
  return (
    <VideoThemeScope
      patches={createThemePatchesFromTheme(props.shot.theme)}
      element="div"
    >
      <ShotSurface {...props} />
    </VideoThemeScope>
  );
}

function ShotSurface({
  shot,
  frame,
  width,
  height,
  productScene,
  style,
}: ShotLayerProps) {
  const tokens = useVideoTokens();
  return (
    <AbsoluteFill style={{ background: tokens.color.scene.ground, ...style }}>
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
