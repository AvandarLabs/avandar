import { clsx } from "clsx";
import { mix } from "../../../../motion";
import { useWindowStage } from "../../../../scenes/TiltedWindowScene/useWindowStage";
import { WindowMotion } from "../../../../scenes/TiltedWindowScene/WindowMotion/WindowMotion";
import { type CarouselWindow } from "../../../../scenes/TiltedWindowScene/WindowMotion/WindowMotion.types";
import {
  HEADLINE_BOX,
  PAIR_BOXES,
  WINDOW_BOX,
  WINDOW_BOX_TALL,
} from "../../../../scenes/TiltedWindowScene/windowTilt";
import css from "../demos.module.css";
import { DemoTheme } from "../DemoTheme";
import { HelperDemoFrame } from "../HelperDemoFrame/HelperDemoFrame";
import { DEMO_CANVAS, DemoCanvas } from "../parts/DemoCanvas";
import { DemoWindow } from "../parts/DemoWindow";
import { getCanvasRect } from "../parts/getCanvasRect";
import { TiltedDemoWindow } from "../parts/TiltedDemoWindow";
import { WindowDemoReadouts } from "./WindowDemoReadouts";
import type { HelperDemoProps } from "../helperDemo.types";
import type { ReactNode } from "react";

const BOX = getCanvasRect(WINDOW_BOX);
const WHIP_IN = 6;
const WHIP_OUT = 60;
/** A window whipping in from the right and out past the left edge. */
export function WindowWhipDemo({ frame, frames }: HelperDemoProps): ReactNode {
  const stage = useWindowStage();
  const pose =
    frame < WHIP_OUT
      ? WindowMotion.getWhipEntrance({
          frame,
          at: WHIP_IN,
          canvas: DEMO_CANVAS,
          box: BOX,
          durationInFrames: undefined,
          stage,
        })
      : WindowMotion.getWhipExit({
          frame,
          at: WHIP_OUT,
          box: BOX,
          durationInFrames: undefined,
          stage,
        });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`WindowMotion.getWhipEntrance({ frame, at: ${WHIP_IN}, canvas, box }) → WindowMotion.getWhipExit({ frame, at: ${WHIP_OUT}, box })`}
      readouts={WindowDemoReadouts.getPoseReadouts(pose)}
    >
      <DemoCanvas>
        <TiltedDemoWindow box={BOX} pose={pose} />
      </DemoCanvas>
    </HelperDemoFrame>
  );
}
const PAIR = PAIR_BOXES.map((box) => {
  return getCanvasRect(box);
});
/** Two windows sliding in from their own outer edges. */
export function SideEntranceDemo({
  frame,
  frames,
}: HelperDemoProps): ReactNode {
  const stage = useWindowStage();
  const poses = PAIR.map((box, side) => {
    return WindowMotion.getSideEntrance({
      frame,
      at: 8 + side * 3,
      side: side === 0 ? 0 : 1,
      canvas: DEMO_CANVAS,
      box,
      durationInFrames: undefined,
      stage,
    });
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={"WindowMotion.getSideEntrance({ frame, at, side, canvas, box })"}
      readouts={poses.map((pose, side) => {
        return {
          name: `side ${side}`,
          value: DemoTheme.formatReadout({ value: pose.translateX, digits: 1 }),
        };
      })}
    >
      <DemoCanvas>
        {PAIR.map((box, side) => {
          return (
            <TiltedDemoWindow
              key={box.x}
              box={box}
              pose={{
                ...poses[side],
                rotateY: (side === 0 ? 1 : -1) * stage.tilt.pairRotateY,
              }}
              perspective={stage.tilt.pairPerspective}
              rotateX={stage.tilt.pairRotateX}
              rotateZ={0}
              variant={side === 0 ? 0 : 1}
            />
          );
        })}
      </DemoCanvas>
    </HelperDemoFrame>
  );
}
const CAROUSEL: CarouselWindow[] = [
  {},
  { atFrame: 30, swap: "slide" },
  { atFrame: 60, swap: "slide" },
];
/** Three windows stepping through a carousel with slides. */
export function CarouselDemo({ frame, frames }: HelperDemoProps): ReactNode {
  const stage = useWindowStage();
  const state = WindowMotion.getCarouselState({
    frame,
    windows: CAROUSEL,
    stage,
  });
  const poses = WindowMotion.getCarouselPoses({
    progress: state.progress,
    box: BOX,
    stage,
  });
  const isSliding = state.previous !== undefined;
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={
        'WindowMotion.getCarouselState({ frame, windows: [{}, { atFrame: 30, swap: "slide" }, { atFrame: 60, swap: "slide" }] })'
      }
      readouts={WindowDemoReadouts.getCarouselReadouts({
        state,
        poses,
        isSliding,
      })}
    >
      <DemoCanvas>
        {isSliding ? (
          <TiltedDemoWindow
            box={BOX}
            pose={poses.outgoing}
            variant={(state.previous ?? 0) as 0 | 1 | 2}
          />
        ) : null}
        <TiltedDemoWindow
          box={BOX}
          pose={isSliding ? poses.incoming : WindowMotion.getRestingPose(stage)}
          variant={state.current as 0 | 1 | 2}
        />
      </DemoCanvas>
    </HelperDemoFrame>
  );
}
const PULL_BACK = { kind: "pull-back", atFrame: 25 } as const;
/** Full-bleed content pulling back into the window box. */
export function PullBackDemo({ frame, frames }: HelperDemoProps): ReactNode {
  const stage = useWindowStage();
  const { rect, tilt } = WindowMotion.getPullBack({
    frame,
    enter: PULL_BACK,
    canvas: DEMO_CANVAS,
    box: BOX,
    stage,
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={
        'WindowMotion.getPullBack({ frame, enter: { kind: "pull-back", atFrame: 25 }, canvas, box })'
      }
      readouts={[
        {
          name: "width",
          value: `${DemoTheme.formatReadout({ value: rect.width, digits: 0 })}px`,
        },
        { name: "tilt", value: DemoTheme.formatReadout({ value: tilt }) },
      ]}
    >
      <DemoCanvas>
        <TiltedDemoWindow
          box={rect}
          pose={WindowMotion.getRestingPose(stage)}
          tilt={tilt}
        />
      </DemoCanvas>
    </HelperDemoFrame>
  );
}
const FLIP_AT = 8;
/** The pair's two windows, joined at 0 and in their own boxes at 1. */
function SplitPair({ split }: { split: number }) {
  const stage = useWindowStage();
  const joinedLeft = (DEMO_CANVAS.width - PAIR[0].width - PAIR[1].width) / 2;
  return PAIR.map((box, side) => {
    return (
      <TiltedDemoWindow
        key={box.x}
        box={{
          ...box,
          x: mix(split, joinedLeft + side * PAIR[0].width, box.x),
        }}
        pose={{
          ...WindowMotion.getRestingPose(stage),
          rotateY: (side === 0 ? 1 : -1) * stage.tilt.pairRotateY,
        }}
        tilt={split}
        perspective={stage.tilt.pairPerspective}
        rotateX={stage.tilt.pairRotateX}
        rotateZ={0}
        variant={side === 0 ? 0 : 1}
      />
    );
  });
}
/** A joined card flipping in, then splitting into the pair boxes. */
export function FlipSplitDemo({ frame, frames }: HelperDemoProps): ReactNode {
  const stage = useWindowStage();
  const flip = WindowMotion.getFlipSplit({
    frame,
    at: FLIP_AT,
    canvasWidth: DEMO_CANVAS.width,
    stage,
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`WindowMotion.getFlipSplit({ frame, at: ${FLIP_AT}, canvasWidth })`}
      readouts={WindowDemoReadouts.getFlipReadouts(flip)}
    >
      <DemoCanvas>
        <div
          className={css.layer}
          style={{
            opacity: flip.opacity,
            transform: `perspective(${stage.tilt.flipPerspective}px) translateX(${flip.translateX.toFixed(2)}px) rotateY(${flip.rotateY.toFixed(3)}deg)`,
          }}
        >
          <SplitPair split={flip.split} />
        </div>
      </DemoCanvas>
    </HelperDemoFrame>
  );
}
const SCROLL_STEPS = [
  { atFrame: 30, offset: 1 / 3 },
  { atFrame: 60, offset: 2 / 3 },
];
/** Tall window content jumping down in two quick steps. */
export function ScrollOffsetDemo({
  frame,
  frames,
}: HelperDemoProps): ReactNode {
  const stage = useWindowStage();
  const offset = WindowMotion.getScrollOffset({
    frame,
    steps: SCROLL_STEPS,
    stage,
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={
        "WindowMotion.getScrollOffset({ frame, steps: [{ atFrame: 30, offset: 0.33 }, { atFrame: 60, offset: 0.67 }] })"
      }
      readouts={[
        { name: "offset", value: DemoTheme.formatReadout({ value: offset }) },
      ]}
    >
      <div className={css.centered}>
        <div className={css.scrollWindow}>
          <div
            className={css.scrollContent}
            style={{
              transform: `translateY(${mix(offset, 0, -100).toFixed(3)}%)`,
            }}
          >
            <DemoWindow variant={0} label="1" />
            <DemoWindow variant={1} label="2" />
            <DemoWindow variant={2} label="3" />
          </div>
        </div>
      </div>
    </HelperDemoFrame>
  );
}
/** Cues of the tilt preview: into the resting tilt, then back to flat. */
const TILT_CUES = { in: 10, out: 60 };
/** A window easing from flat into the resting tilt and back. */
export function WindowTiltDemo({ frame, frames }: HelperDemoProps): ReactNode {
  const stage = useWindowStage();
  const { motion } = stage;
  const easing = motion.travel.easing;
  const tilt =
    motion.ramp(frame, TILT_CUES.in, motion.hero, easing) *
    (1 - motion.ramp(frame, TILT_CUES.out, motion.hero, easing));
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`perspective(${stage.tilt.perspective}px) rotateY(${stage.tilt.rotateY}°) rotateX(${stage.tilt.rotateX}°) rotateZ(${stage.tilt.rotateZ}°)`}
      readouts={[
        { name: "tilt share", value: DemoTheme.formatReadout({ value: tilt }) },
        {
          name: "rotateY",
          value: `${DemoTheme.formatReadout({
            value: stage.tilt.rotateY * tilt,
            digits: 1,
          })}°`,
        },
      ]}
    >
      <DemoCanvas>
        <TiltedDemoWindow
          box={BOX}
          pose={WindowMotion.getRestingPose(stage)}
          tilt={tilt}
        />
      </DemoCanvas>
    </HelperDemoFrame>
  );
}
/** Each named box, cycled one at a time. */
const NAMED_BOXES = [
  { name: "WINDOW_BOX", boxes: [WINDOW_BOX] },
  { name: "WINDOW_BOX_TALL", boxes: [WINDOW_BOX_TALL] },
  { name: "PAIR_BOXES", boxes: PAIR_BOXES },
  { name: "HEADLINE_BOX", boxes: [HEADLINE_BOX] },
] as const;
/** Drawn height of the headline column, which has no fixed height. */
const HEADLINE_DRAWN_HEIGHT = 0.3;
/** Every named box on the mini canvas, the active one filled and labelled. */
function BoxOutlines({ activeIndex }: { activeIndex: number }) {
  return NAMED_BOXES.flatMap((named, index) => {
    return named.boxes.map((fractions) => {
      const rect = getCanvasRect({
        height: HEADLINE_DRAWN_HEIGHT,
        ...fractions,
      });
      const isActive = index === activeIndex;
      return (
        <div
          key={`${named.name}-${fractions.x}`}
          className={clsx(css.box, isActive && css.boxActive)}
          style={{
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
          }}
        >
          {isActive ? <span className={css.boxLabel}>{named.name}</span> : null}
        </div>
      );
    });
  });
}
/** Every window and headline box on the canvas, highlighted in turn. */
export function WindowBoxesDemo({ frame, frames }: HelperDemoProps): ReactNode {
  const activeIndex = Math.floor(frame / 30) % NAMED_BOXES.length;
  const active = NAMED_BOXES[activeIndex];
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={active.name}
      readouts={[
        { name: "x", value: String(active.boxes[0].x) },
        { name: "y", value: String(active.boxes[0].y) },
        { name: "width", value: String(active.boxes[0].width) },
        {
          name: "height",
          value:
            "height" in active.boxes[0]
              ? String(active.boxes[0].height)
              : "fits its lines",
        },
      ]}
    >
      <DemoCanvas>
        <BoxOutlines activeIndex={activeIndex} />
      </DemoCanvas>
    </HelperDemoFrame>
  );
}
