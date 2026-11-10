import { SceneShell } from "../SceneShell";
import { RacePair } from "./RacePair";
import { WindowCard } from "./WindowCard";
import { WindowHeadlines } from "./WindowHeadlines";
import {
  getCarouselPoses,
  getCarouselState,
  getPullBack,
  getWhipEntrance,
  getWhipExit,
  getWindowCamera,
} from "./windowMotion";
import { WINDOW_BOX, WINDOW_TILT } from "./windowTilt";
import type { Rect } from "../layout/layout";
import type { TiltedWindowSceneProps } from "../scenes.types";
import type { WindowPose } from "./windowMotion";

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
export function TiltedWindowScene(props: TiltedWindowSceneProps) {
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
        <_SingleWindow {...props} width={width} height={height} />
      )}
    </SceneShell>
  );
}

/** The primary window, its carousel and camera, and the secondary window. */
function _SingleWindow(
  props: TiltedWindowSceneProps & { width: number; height: number },
) {
  const { frame, width, height, windows = [], exit, camera, secondary } = props;
  const canvas = { width, height };
  const box = _toPixels(WINDOW_BOX, canvas);
  const base = _getBasePose(props, box);
  const pullBack =
    props.enter?.kind === "pull-back"
      ? getPullBack(frame, props.enter, canvas, box)
      : undefined;
  const rect = pullBack?.rect ?? box;
  const carousel = getCarouselState(frame, windows);
  const slide = getCarouselPoses(carousel.progress, box);
  const lens = camera ? getWindowCamera(frame, camera, box) : undefined;
  const card = (index: number, pose: WindowPose) => (
    <WindowCard
      key={`window-${index}-${windows[index].src}`}
      frame={frame}
      rect={rect}
      pose={_combinePoses(base, pose, lens?.blurX ?? 0)}
      source={windows[index]}
      canvasHeight={height}
      tilt={pullBack?.tilt ?? 1}
      chrome={props.chrome}
    />
  );
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
              carousel.previous !== undefined ? slide.incoming : _RESTING,
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
                )
              : getWhipEntrance(
                  frame,
                  secondary.atFrame,
                  canvas,
                  _toPixels(secondary.box, canvas),
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

const _RESTING: WindowPose = {
  translateX: 0,
  translateZ: 0,
  rotateY: WINDOW_TILT.rotateY,
  opacity: 1,
  blurX: 0,
};

/** The whole window's entrance or exit pose at this frame. */
function _getBasePose(
  props: TiltedWindowSceneProps & { width: number },
  box: Rect,
): WindowPose {
  const { frame, exit, enter } = props;
  if (exit && frame >= exit.atFrame) {
    return getWhipExit(frame, exit.atFrame, box);
  }
  if (enter === undefined || enter.kind === "whip") {
    return getWhipEntrance(
      frame,
      enter?.atFrame ?? 1,
      { width: props.width },
      box,
    );
  }
  return _RESTING;
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
