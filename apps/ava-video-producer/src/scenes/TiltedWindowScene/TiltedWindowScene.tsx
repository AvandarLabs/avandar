import { useVideoTheme } from "../../videoTheme/useVideoTheme";
import { SceneShell } from "../SceneShell";
import { RacePair } from "./RacePair";
import { useWindowStage } from "./useWindowStage";
import { WindowCard } from "./WindowCard";
import { WindowHeadlines } from "./WindowHeadlines";
import {
  getCarouselPoses,
  getCarouselState,
  getPullBack,
  getRestingPose,
  getWhipEntrance,
  getWhipExit,
  getWindowCamera,
  getWindowRevealStyle,
} from "./windowMotion";
import { HEADLINE_BOX, WINDOW_BOXES } from "./windowTilt";
import type { Rect } from "../layout/layout";
import type { TiltedWindowSceneProps } from "../scenes.types";
import type { WindowPose, WindowStage } from "./windowMotion";
import type { ReactNode } from "react";

/**
 * A headline on the left and captured product stills or footage in a 3D
 * tilted window on the right, for a feature beat in a launch-style film.
 * The window whips in and out, can cycle through a carousel, carry a
 * second small window, push in with a camera, or open full-bleed and pull
 * back into place. The `pair` layout races two windows side by side.
 *
 * Only stills and footage go in the window: live product UI must never sit
 * under its lasting 3D transform.
 */
export function TiltedWindowScene(props: TiltedWindowSceneProps): ReactNode {
  const { frame, width = 1600, height = 1000, headlines, exit } = props;
  return (
    <SceneShell frame={frame} width={width} height={height}>
      {headlines?.length ? (
        <WindowHeadlines
          frame={frame}
          headlines={headlines}
          width={width}
          height={height}
          exitAtFrame={exit?.atFrame}
        />
      ) : null}
      {props.layout === "pair" && props.pair ? (
        <RacePair {...props} pair={props.pair} width={width} height={height} />
      ) : (
        <SingleWindow {...props} width={width} height={height} />
      )}
      {props.footnote ? (
        <WindowFootnote frame={frame} text={props.footnote} exit={exit} />
      ) : null}
    </SceneShell>
  );
}

/** The primary window, its carousel and camera, and the secondary window. */
function SingleWindow(
  props: TiltedWindowSceneProps & { width: number; height: number },
) {
  const { frame, width, height, windows = [], exit, camera, secondary } = props;
  const stage = useWindowStage();
  const canvas = { width, height };
  const box = _toPixels(WINDOW_BOXES[props.windowBox ?? "default"], canvas);
  const base = _getBasePose(props, box, stage);
  const pullBack =
    props.enter?.kind === "pull-back"
      ? getPullBack(frame, props.enter, canvas, box, stage)
      : undefined;
  const rect = pullBack?.rect ?? box;
  const carousel = getCarouselState(frame, windows, stage);
  const slide = getCarouselPoses(carousel.progress, box, stage);
  const lens = camera ? getWindowCamera(frame, camera, box, stage) : undefined;
  const reveal =
    props.enter?.kind === "whip"
      ? getWindowRevealStyle(
          frame,
          props.enter.atFrame ?? 1,
          props.enter.reveal,
          stage,
        ).clipPath
      : undefined;
  const card = (index: number, pose: WindowPose) => {
    return (
      <WindowCard
        key={`window-${index}-${windows[index].src}`}
        frame={frame}
        rect={rect}
        pose={_combinePoses(base, pose, lens?.blurX ?? 0)}
        source={windows[index]}
        canvasHeight={height}
        tilt={pullBack?.tilt ?? 1}
        chrome={props.chrome}
        clipPath={reveal}
      />
    );
  };
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformOrigin: lens
            ? `${box.x + lens.originX * box.width}px ${box.y + lens.originY * box.height}px`
            : undefined,
          transform:
            lens && lens.scale !== 1
              ? `scale(${lens.scale.toFixed(4)})`
              : undefined,
        }}
      >
        {carousel.previous !== undefined
          ? card(carousel.previous, slide.outgoing)
          : null}
        {windows.length
          ? card(
              carousel.current,
              carousel.previous !== undefined
                ? slide.incoming
                : getRestingPose(stage),
            )
          : null}
      </div>
      {secondary ? (
        <WindowCard
          frame={frame}
          rect={_toPixels(secondary.box, canvas)}
          pose={
            exit && frame >= exit.atFrame
              ? getWhipExit(
                  frame,
                  exit.atFrame,
                  _toPixels(secondary.box, canvas),
                  exit.durationInFrames,
                  stage,
                )
              : getWhipEntrance(
                  frame,
                  secondary.atFrame,
                  canvas,
                  _toPixels(secondary.box, canvas),
                  undefined,
                  stage,
                )
          }
          source={secondary}
          canvasHeight={height}
          chrome={props.chrome}
        />
      ) : null}
    </>
  );
}

/** The whole window's entrance or exit pose at this frame. */
function _getBasePose(
  props: TiltedWindowSceneProps & { width: number },
  box: Rect,
  stage: WindowStage,
): WindowPose {
  const { frame, exit, enter } = props;
  if (exit && frame >= exit.atFrame) {
    return getWhipExit(frame, exit.atFrame, box, exit.durationInFrames, stage);
  }
  if (enter === undefined || enter.kind === "whip") {
    return getWhipEntrance(
      frame,
      enter?.atFrame ?? 1,
      { width: props.width },
      box,
      enter?.durationInFrames,
      stage,
    );
  }
  return getRestingPose(stage);
}

/** Layers a carousel slide over the whole window's entrance or exit. */
function _combinePoses(
  base: WindowPose,
  slide: WindowPose,
  cameraBlur: number,
): WindowPose {
  return {
    translateX: base.translateX + slide.translateX,
    translateZ: base.translateZ + slide.translateZ,
    rotateY: base.rotateY,
    opacity: base.opacity * slide.opacity,
    blurX: Math.max(base.blurX, slide.blurX, cameraBlur),
  };
}

function _toPixels(
  box: { x: number; y: number; width: number; height: number },
  canvas: { width: number; height: number },
): Rect {
  return {
    x: box.x * canvas.width,
    y: box.y * canvas.height,
    width: box.width * canvas.width,
    height: box.height * canvas.height,
  };
}

/** A small muted note at the bottom left that fades out with the exit. */
function WindowFootnote({
  frame,
  text,
  exit,
}: {
  frame: number;
  text: string;
  exit: TiltedWindowSceneProps["exit"];
}) {
  const theme = useVideoTheme();
  const { motion } = useWindowStage();
  const fade = exit
    ? 1 -
      motion.ramp(frame, exit.atFrame + 1, motion.chip, motion.dissolve.easing)
    : 1;
  const arrive = motion.ramp(frame, 1, motion.panel, motion.entrance.easing);
  return (
    <p
      style={{
        position: "absolute",
        left: `${HEADLINE_BOX.x * 100}%`,
        bottom: 40,
        margin: 0,
        fontSize: theme.mantine.fontSizes.xl,
        color: theme.semantic.color.scene.mutedForeground,
        opacity: arrive * fade,
      }}
    >
      {text}
    </p>
  );
}
