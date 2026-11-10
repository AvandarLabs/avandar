import { DUR, EASE, enter, mix, mixToken, ramp } from "../../motion";
import { formatMetric } from "../layout/layout";
import { WindowCard } from "./WindowCard";
import { getFlipSplit, getWhipEntrance, getWhipExit } from "./windowMotion";
import { PAIR_BOXES, PAIR_TILT } from "./windowTilt";
import type { RaceColumn, TiltedWindowSceneProps } from "../scenes.types";

type Props = TiltedWindowSceneProps & {
  pair: [RaceColumn, RaceColumn];
  width: number;
  height: number;
};

/**
 * Two windows side by side, each with a label above and a live counter
 * below, for a race between two runs of the same task. The pair can enter
 * as one card that flips in and splits apart.
 */
export function RacePair(props: Props) {
  const { frame, pair, width, height, enter: entrance, exit } = props;
  const at = entrance?.atFrame ?? 1;
  const isFlip = (entrance?.kind ?? "flip-split") === "flip-split";
  const flip = isFlip ? getFlipSplit(frame, at, width) : undefined;
  const split = flip ? flip.split : 1;
  const boxes = PAIR_BOXES.map((box) => ({
    x: box.x * width,
    y: box.y * height,
    width: box.width * width,
    height: box.height * height,
  }));
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformOrigin: "50% 50%",
          opacity: flip?.opacity,
          transform: flip
            ? `perspective(${PAIR_TILT.flipPerspective}px) translateX(${flip.translateX.toFixed(2)}px) rotateY(${flip.rotateY.toFixed(3)}deg)`
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
              ? getWhipExit(frame, exit.atFrame, box)
              : entrance?.kind === "whip"
                ? getWhipEntrance(frame, at, { width }, box)
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
              pose={{ ...base, rotateY: sign * PAIR_TILT.rotateY }}
              source={column.window}
              canvasHeight={height}
              tilt={split}
              chrome={props.chrome}
              rotateX={PAIR_TILT.rotateX}
              rotateZ={0}
              perspective={PAIR_TILT.perspective}
            />
          );
        })}
      </div>
      {pair.map((column, side) => (
        <_RaceStats
          key={`${side}-${column.label}`}
          {...props}
          column={column}
          side={side}
          labelsAt={at + 2}
        />
      ))}
    </>
  );
}

/** One column's label, counter and stat, outside the flipping card. */
function _RaceStats({
  frame,
  column,
  side,
  width,
  height,
  badge,
  labelsAt,
  exit,
}: Props & { column: RaceColumn; side: number; labelsAt: number }) {
  const left = PAIR_BOXES[side].x * width + width * 0.027;
  const { counter } = column;
  const elapsed = ramp(
    frame,
    counter.startFrame,
    counter.endFrame - counter.startFrame,
    (t) => t,
  );
  const done = ramp(frame, counter.endFrame, DUR.chip, EASE.out);
  const fade = exit
    ? 1 - ramp(frame, exit.atFrame + 1, DUR.chip, EASE.inOut)
    : 1;
  const arrive = enter(frame, labelsAt, { y: 0 });
  return (
    <div style={{ position: "absolute", inset: 0, opacity: fade }}>
      <div
        style={{
          position: "absolute",
          left,
          top: height * 0.085,
          fontSize: height * 0.05,
          fontWeight: 600,
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
            fontWeight: 600,
            color: "var(--brand)",
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
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          color: mixToken(done, "var(--foreground)", "var(--brand)"),
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
            color: "var(--muted-foreground)",
            ...arrive,
          }}
        >
          {column.stat}
        </div>
      ) : null}
    </div>
  );
}
