import { mix } from "../../motion";
import { RaceStats } from "./RaceStats/RaceStats";
import { useWindowStage } from "./useWindowStage";
import { WindowCard } from "./WindowCard";
import { WindowMotion } from "./WindowMotion/WindowMotion";
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
  const flip = isFlip
    ? WindowMotion.getFlipSplit({ frame, at, canvasWidth: width, stage })
    : undefined;
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
              ? WindowMotion.getWhipExit({
                  frame,
                  at: exit.atFrame,
                  box,
                  durationInFrames: exit.durationInFrames,
                  stage,
                })
              : entrance?.kind === "whip"
                ? WindowMotion.getWhipEntrance({
                    frame,
                    at,
                    canvas: { width },
                    box,
                    durationInFrames: entrance.durationInFrames,
                    stage,
                  })
                : entrance?.kind === "from-sides"
                  ? WindowMotion.getSideEntrance({
                      frame,
                      at,
                      side: side === 0 ? 0 : 1,
                      canvas: { width },
                      box,
                      durationInFrames: entrance.durationInFrames,
                      stage,
                    })
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
          <RaceStats
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
