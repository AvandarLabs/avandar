import { mix, mixToken } from "../../motion";
import { useVideoTokens } from "../../videoTheme/useVideoTheme";
import { formatMetric } from "../layout/layout";
import { useWindowStage } from "./useWindowStage";
import { WindowCard } from "./WindowCard";
import {
  getFlipSplit,
  getSideEntrance,
  getWhipEntrance,
  getWhipExit,
  type WindowStage,
} from "./windowMotion";
import { PAIR_BOXES } from "./windowTilt";
import type { RaceColumn, TiltedWindowSceneProps } from "../scenes.types";
import type { ReactNode } from "react";

type Props = TiltedWindowSceneProps & {
  pair: [RaceColumn, RaceColumn];
  width: number;
  height: number;
};

/**
 * Two windows side by side, each with a label above and a live counter
 * below, for a race between two runs of the same task. The pair can enter
 * as one card that flips in and splits apart. The mirrored tilt is the
 * pair's part of `components.WindowTilt`.
 */
export function RacePair(props: Props): ReactNode {
  const { frame, pair, width, height, enter: entrance, exit } = props;
  const stage = useWindowStage();
  const tilt = stage.tilt;
  const at = entrance?.atFrame ?? 1;
  const isFlip = (entrance?.kind ?? "flip-split") === "flip-split";
  const flip = isFlip ? getFlipSplit(frame, at, width, stage) : undefined;
  const split = flip ? flip.split : 1;
  const boxes = PAIR_BOXES.map((box) => {
    return {
      x: box.x * width,
      y: box.y * height,
      width: box.width * width,
      height: box.height * height,
    };
  });
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformOrigin: "50% 50%",
          opacity: flip?.opacity,
          transform: flip
            ? `perspective(${tilt.flipPerspective}px) translateX(${flip.translateX.toFixed(2)}px) rotateY(${flip.rotateY.toFixed(3)}deg)`
            : undefined,
        }}
      >
        {pair.map((column, side) => {
          const box = boxes[side];
          // Joined, the two windows meet at the canvas centre.
          const joinedX = side === 0 ? width / 2 - box.width : width / 2;
          const sign = side === 0 ? 1 : -1;
          const base =
            exit && frame >= exit.atFrame
              ? getWhipExit(
                  frame,
                  exit.atFrame,
                  box,
                  exit.durationInFrames,
                  stage,
                )
              : entrance?.kind === "whip"
                ? getWhipEntrance(
                    frame,
                    at,
                    { width },
                    box,
                    entrance.durationInFrames,
                    stage,
                  )
                : entrance?.kind === "from-sides"
                  ? getSideEntrance(
                      frame,
                      at,
                      side === 0 ? 0 : 1,
                      { width },
                      box,
                      entrance.durationInFrames,
                      stage,
                    )
                  : {
                      translateX: 0,
                      translateZ: 0,
                      rotateY: 0,
                      opacity: 1,
                      blurX: 0,
                    };
          return (
            <WindowCard
              key={`${side}-${column.label}`}
              frame={frame}
              rect={{ ...box, x: mix(split, joinedX, box.x) }}
              pose={{ ...base, rotateY: sign * tilt.pairRotateY }}
              source={column.window}
              canvasHeight={height}
              tilt={split}
              chrome={props.chrome}
              rotateX={tilt.pairRotateX}
              rotateZ={0}
              perspective={tilt.pairPerspective}
            />
          );
        })}
      </div>
      {pair.map((column, side) => {
        return (
          <_RaceStats
            key={`${side}-${column.label}`}
            {...props}
            column={column}
            side={side}
            labelsAt={at + 2}
            stage={stage}
          />
        );
      })}
    </>
  );
}

/**
 * One column's label, counter and stat, outside the flipping card, in the
 * `text.stage.windowHeadline` weight. The counter turns from the foreground
 * to the brand colour as it finishes.
 */
function _RaceStats({
  frame,
  column,
  side,
  width,
  height,
  badge,
  labelsAt,
  exit,
  stage,
}: Props & {
  column: RaceColumn;
  side: number;
  labelsAt: number;
  stage: WindowStage;
}) {
  const tokens = useVideoTokens();
  const { motion } = stage;
  const scene = tokens.color.scene;
  const fontWeight = tokens.text.stage.windowHeadline.fontWeight;
  const left = PAIR_BOXES[side].x * width + width * 0.027;
  const { counter } = column;
  const elapsed = motion.ramp(
    frame,
    counter.startFrame,
    counter.endFrame - counter.startFrame,
    (t) => {
      return t;
    },
  );
  const done = motion.ramp(
    frame,
    counter.endFrame,
    motion.chip,
    motion.entrance.easing,
  );
  const fade = exit
    ? 1 -
      motion.ramp(frame, exit.atFrame + 1, motion.chip, motion.dissolve.easing)
    : 1;
  const arrive = motion.enter(frame, labelsAt, { y: 0 });
  return (
    <div style={{ position: "absolute", inset: 0, opacity: fade }}>
      <div
        style={{
          position: "absolute",
          left,
          top: height * 0.085,
          fontSize: height * 0.05,
          fontWeight,
          ...arrive,
        }}
      >
        {column.label}
      </div>
      {badge && side === 1 ? (
        <div
          style={{
            position: "absolute",
            right: width * 0.04,
            top: height * 0.095,
            fontSize: height * 0.026,
            fontWeight,
            color: scene.brand,
            ...arrive,
          }}
        >
          {badge}
        </div>
      ) : null}
      <div
        style={{
          position: "absolute",
          left,
          top: height * 0.825,
          fontSize: height * 0.1,
          fontWeight,
          fontVariantNumeric: "tabular-nums",
          color: mixToken(done, scene.foreground, scene.brand),
          ...arrive,
        }}
      >
        {formatMetric(
          mix(elapsed, counter.from ?? 0, counter.to),
          counter.precision ?? 1,
        )}
        {counter.unit ?? ""}
      </div>
      {column.stat ? (
        <div
          style={{
            position: "absolute",
            right:
              width * (1 - PAIR_BOXES[side].x - PAIR_BOXES[side].width) +
              width * 0.01,
            top: height * 0.885,
            fontSize: height * 0.026,
            color: scene.mutedForeground,
            ...arrive,
          }}
        >
          {column.stat}
        </div>
      ) : null}
    </div>
  );
}
