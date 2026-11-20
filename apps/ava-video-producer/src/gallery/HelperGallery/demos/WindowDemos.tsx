import { clsx } from "clsx";
import { DUR, EASE, mix, ramp } from "../../../motion";
import {
  getCarouselPoses,
  getCarouselState,
  getFlipSplit,
  getPullBack,
  getScrollOffset,
  getSideEntrance,
  getWhipEntrance,
  getWhipExit,
} from "../../../scenes/TiltedWindowScene/windowMotion";
import {
  HEADLINE_BOX,
  PAIR_BOXES,
  PAIR_TILT,
  WINDOW_BOX,
  WINDOW_BOX_TALL,
  WINDOW_TILT,
} from "../../../scenes/TiltedWindowScene/windowTilt";
import css from "./demos.module.css";
import { formatReadout } from "./demoTheme";
import { HelperDemoFrame } from "./HelperDemoFrame/HelperDemoFrame";
import { DEMO_CANVAS, DemoCanvas } from "./parts/DemoCanvas";
import { DemoWindow } from "./parts/DemoWindow";
import { getCanvasRect } from "./parts/getCanvasRect";
import { RESTING_WINDOW_POSE } from "./parts/parts.constants";
import { TiltedDemoWindow } from "./parts/TiltedDemoWindow";
import type {
  CarouselWindow,
  WindowPose,
} from "../../../scenes/TiltedWindowScene/windowMotion";
import type { HelperDemoProps } from "./helperDemo.types";
import type { ReactNode } from "react";

const BOX = getCanvasRect(WINDOW_BOX);

/** The pose readouts every window preview shows. */
function _getPoseReadouts(pose: WindowPose) {
  return [
    { name: "translateX", value: formatReadout(pose.translateX, 1) },
    { name: "rotateY", value: `${formatReadout(pose.rotateY, 1)}°` },
    { name: "blurX", value: `${formatReadout(pose.blurX, 1)}px` },
  ];
}

const WHIP_IN = 6;
const WHIP_OUT = 60;

/** A window whipping in from the right and out past the left edge. */
export function WindowWhipDemo({ frame, frames }: HelperDemoProps): ReactNode {
  const pose =
    frame < WHIP_OUT
      ? getWhipEntrance(frame, WHIP_IN, DEMO_CANVAS, BOX)
      : getWhipExit(frame, WHIP_OUT, BOX);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`getWhipEntrance(frame, ${WHIP_IN}, canvas, box) → getWhipExit(frame, ${WHIP_OUT}, box)`}
      readouts={_getPoseReadouts(pose)}
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
  const poses = PAIR.map((box, side) => {
    return getSideEntrance(
      frame,
      8 + side * 3,
      side === 0 ? 0 : 1,
      DEMO_CANVAS,
      box,
    );
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label="getSideEntrance(frame, at, side, canvas, box)"
      readouts={poses.map((pose, side) => {
        return {
          name: `side ${side}`,
          value: formatReadout(pose.translateX, 1),
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
                rotateY: (side === 0 ? 1 : -1) * PAIR_TILT.rotateY,
              }}
              perspective={PAIR_TILT.perspective}
              rotateX={PAIR_TILT.rotateX}
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
  const state = getCarouselState(frame, CAROUSEL);
  const poses = getCarouselPoses(state.progress, BOX);
  const isSliding = state.previous !== undefined;
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label='getCarouselState(frame, [{}, { atFrame: 30, swap: "slide" }, { atFrame: 60, swap: "slide" }])'
      readouts={[
        { name: "current", value: String(state.current) },
        { name: "progress", value: formatReadout(state.progress) },
        {
          name: "outgoing opacity",
          value: formatReadout(isSliding ? poses.outgoing.opacity : 0),
        },
      ]}
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
          pose={isSliding ? poses.incoming : RESTING_WINDOW_POSE}
          variant={state.current as 0 | 1 | 2}
        />
      </DemoCanvas>
    </HelperDemoFrame>
  );
}

const PULL_BACK = { kind: "pull-back", atFrame: 25 } as const;

/** Full-bleed content pulling back into the window box. */
export function PullBackDemo({ frame, frames }: HelperDemoProps): ReactNode {
  const { rect, tilt } = getPullBack(frame, PULL_BACK, DEMO_CANVAS, BOX);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label='getPullBack(frame, { kind: "pull-back", atFrame: 25 }, canvas, box)'
      readouts={[
        { name: "width", value: `${formatReadout(rect.width, 0)}px` },
        { name: "tilt", value: formatReadout(tilt) },
      ]}
    >
      <DemoCanvas>
        <TiltedDemoWindow box={rect} pose={RESTING_WINDOW_POSE} tilt={tilt} />
      </DemoCanvas>
    </HelperDemoFrame>
  );
}

const FLIP_AT = 8;

/** The pair's two windows, joined at 0 and in their own boxes at 1. */
function SplitPair({ split }: { split: number }) {
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
          ...RESTING_WINDOW_POSE,
          rotateY: (side === 0 ? 1 : -1) * PAIR_TILT.rotateY,
        }}
        tilt={split}
        perspective={PAIR_TILT.perspective}
        rotateX={PAIR_TILT.rotateX}
        rotateZ={0}
        variant={side === 0 ? 0 : 1}
      />
    );
  });
}

/** A joined card flipping in, then splitting into the pair boxes. */
export function FlipSplitDemo({ frame, frames }: HelperDemoProps): ReactNode {
  const flip = getFlipSplit(frame, FLIP_AT, DEMO_CANVAS.width);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`getFlipSplit(frame, ${FLIP_AT}, canvasWidth)`}
      readouts={[
        { name: "rotateY", value: `${formatReadout(flip.rotateY, 1)}°` },
        { name: "translateX", value: formatReadout(flip.translateX, 1) },
        { name: "split", value: formatReadout(flip.split) },
      ]}
    >
      <DemoCanvas>
        <div
          className={css.layer}
          style={{
            opacity: flip.opacity,
            transform: `perspective(${PAIR_TILT.flipPerspective}px) translateX(${flip.translateX.toFixed(2)}px) rotateY(${flip.rotateY.toFixed(3)}deg)`,
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
  const offset = getScrollOffset(frame, SCROLL_STEPS);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label="getScrollOffset(frame, [{ atFrame: 30, offset: 0.33 }, { atFrame: 60, offset: 0.67 }])"
      readouts={[{ name: "offset", value: formatReadout(offset) }]}
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

/** A window easing from flat into the resting tilt and back. */
export function WindowTiltDemo({ frame, frames }: HelperDemoProps): ReactNode {
  const tilt =
    ramp(frame, 10, DUR.hero, EASE.inOut) *
    (1 - ramp(frame, 60, DUR.hero, EASE.inOut));
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`perspective(${WINDOW_TILT.perspective}px) rotateY(${WINDOW_TILT.rotateY}°) rotateX(${WINDOW_TILT.rotateX}°) rotateZ(${WINDOW_TILT.rotateZ}°)`}
      readouts={[
        { name: "tilt share", value: formatReadout(tilt) },
        {
          name: "rotateY",
          value: `${formatReadout(WINDOW_TILT.rotateY * tilt, 1)}°`,
        },
      ]}
    >
      <DemoCanvas>
        <TiltedDemoWindow box={BOX} pose={RESTING_WINDOW_POSE} tilt={tilt} />
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
