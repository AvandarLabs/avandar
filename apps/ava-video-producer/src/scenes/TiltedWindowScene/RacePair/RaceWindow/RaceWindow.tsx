import { Motion } from "../../../../motion";
import { WindowCard } from "../../WindowCard/WindowCard";
import { WindowMotion } from "../../WindowMotion/WindowMotion";
import type { Rect } from "../../../layout/SceneGeometry";
import type { RaceColumn } from "../../../scenes.types";
import type { useWindowStage } from "../../useWindowStage";
import type { WindowPose } from "../../WindowMotion/WindowMotion.types";
import type { Props as RaceInput } from "../RacePair.types";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  column: RaceColumn;
  side: number;
  width: number;
  height: number;
  boxes: Rect[];
  split: number;
  exit: RaceInput["exit"];
  entrance: RaceInput["enter"];
  at: number;
  stage: ReturnType<typeof useWindowStage>;
  tilt: ReturnType<typeof useWindowStage>["tilt"];
  props: RaceInput;
};
/** Renders one race window. */
export function RaceWindow({
  column,
  side,
  ...context
}: Readonly<Props>): ReactNode {
  const { frame, width, height, boxes, split, tilt, props } = context;
  const box = boxes[side];
  // Joined, the two windows meet at the canvas centre.
  const joinedX = side === 0 ? width / 2 - box.width : width / 2;
  const sign = side === 0 ? 1 : -1;
  const base = _getRaceWindowPoseFromStage({ ...context, side, box });
  return (
    <WindowCard
      key={`${side}-${column.label}`}
      frame={frame}
      rect={{
        ...box,
        x: Motion.mix({
          t: split,
          from: joinedX,
          to: box.x,
        }),
      }}
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
}
type RacePoseOptions = Pick<
  Props,
  "frame" | "exit" | "entrance" | "at" | "width" | "stage" | "side"
> & { box: Rect };
/** Samples one race window entrance or exit on the shared window stage. */
function _getRaceWindowPoseFromStage({
  frame,
  exit,
  entrance,
  at,
  width,
  stage,
  side,
  box,
}: Readonly<RacePoseOptions>): WindowPose {
  return exit && frame >= exit.atFrame
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
}
