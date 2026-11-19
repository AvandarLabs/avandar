import clsx from "clsx";
import { useId } from "react";
import {
  HorizontalBlurFilter,
  getHorizontalBlurFilter,
} from "../../../motion-components/HorizontalBlur";
import {
  getMotionProgress,
  useMotionSettingsTheme,
} from "../../../motion-components/motionSettings";
import { getSceneTransitionStyle } from "../../../motion-components/SceneTransition";
import { getShotTransitionLayers } from "../../../storyboard/StoryFilm/getShotTransitionLayers";
import { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import css from "./demos.module.css";
import { formatReadout } from "./demoTheme";
import { HelperDemoFrame } from "./HelperDemoFrame/HelperDemoFrame";
import type { SceneTransitionKind } from "../../../motion-components/SceneTransition";
import type { ShotTransition } from "../../../storyboard/schema/shotTransitionSchema";
import type { HelperDemoProps } from "./helperDemo.types";
import type { ReactNode } from "react";

const CUT_AT = 30;
const SHOT_WIDTH = 270;
/** The three transition kinds a storyboard shot can declare. */
const TRANSITIONS: Array<{
  code: string;
  transition?: ShotTransition;
  frames: number;
}> = [
  { code: "dissolve (default)", frames: 18 },
  {
    code: "stepped-column-wipe + drift",
    transition: {
      kind: "stepped-column-wipe",
      outgoingDrift: { x: -0.2, blur: 16 },
    },
    frames: 18,
  },
  { code: "cut", transition: { kind: "cut" }, frames: 0 },
];

/** One shot boundary drawn from the two layers the helper returns. */
function ShotBoundary(props: {
  frame: number;
  transition?: ShotTransition;
  frames: number;
}) {
  const filterId = `shot-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const motion = useVideoMotion();
  if (props.frame < CUT_AT) {
    return <div className={clsx(css.shot, css.shotA)}>A</div>;
  }
  const layers = getShotTransitionLayers({
    transition: props.transition,
    transitionInFrames: props.frames,
    previousDurationInFrames: CUT_AT,
    localFrame: props.frame - CUT_AT,
    width: SHOT_WIDTH,
    motion,
  });
  return (
    <>
      {layers.outgoing ? (
        <>
          <HorizontalBlurFilter id={filterId} amount={layers.outgoing.blurX} />
          <div
            className={clsx(css.shot, css.shotA)}
            style={{
              transform: `translateX(${layers.outgoing.offsetX.toFixed(2)}px)`,
              filter: getHorizontalBlurFilter(filterId, layers.outgoing.blurX),
            }}
          >
            A
          </div>
        </>
      ) : null}
      <div className={clsx(css.shot, css.shotB)} style={layers.incoming}>
        B
      </div>
    </>
  );
}

/** Shot A handing over to shot B under each declared transition. */
export function ShotTransitionDemo({
  frame,
  frames,
}: HelperDemoProps): ReactNode {
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`getShotTransitionLayers({ transition, transitionInFrames, localFrame: frame - ${CUT_AT}, ... })`}
      readouts={[
        { name: "localFrame", value: String(Math.max(0, frame - CUT_AT)) },
      ]}
    >
      <div className={clsx(css.miniStages, css.threeUp)}>
        {TRANSITIONS.map((item) => {
          return (
            <div key={item.code} className={css.miniStage}>
              <div className={clsx(css.miniFrame, css.miniFrameShort)}>
                <ShotBoundary
                  frame={frame}
                  transition={item.transition}
                  frames={item.frames}
                />
              </div>
              <span className={css.caption}>{item.code}</span>
            </div>
          );
        })}
      </div>
    </HelperDemoFrame>
  );
}

const SCENE_KINDS: SceneTransitionKind[] = [
  "dissolve",
  "wipe",
  "aperture",
  "spatial",
  "morph",
];
const STAGE = { width: 160, height: 110 };

/** The scene transition kinds at the same progress, side by side. */
export function SceneTransitionDemo({
  frame,
  frames,
}: HelperDemoProps): ReactNode {
  const settingsTheme = useMotionSettingsTheme();
  const progress = getMotionProgress(
    frame,
    15,
    30,
    undefined,
    undefined,
    settingsTheme,
  );
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label="getSceneTransitionStyle(progress, entering, { kind, width, height })"
      readouts={[
        { name: "progress", value: formatReadout(progress) },
        { name: "window", value: "15f to 45f" },
      ]}
    >
      <div className={clsx(css.miniStages, css.fiveUp)}>
        {SCENE_KINDS.map((kind) => {
          const props = { kind, ...STAGE };
          return (
            <div key={kind} className={css.miniStage}>
              <div className={clsx(css.miniFrame, css.miniFrameScene)}>
                <div
                  className={clsx(css.shot, css.shotA)}
                  style={getSceneTransitionStyle(progress, false, props, settingsTheme)}
                >
                  A
                </div>
                <div
                  className={clsx(css.shot, css.shotB)}
                  style={getSceneTransitionStyle(progress, true, props, settingsTheme)}
                >
                  B
                </div>
              </div>
              <span className={css.caption}>{kind}</span>
            </div>
          );
        })}
      </div>
    </HelperDemoFrame>
  );
}
