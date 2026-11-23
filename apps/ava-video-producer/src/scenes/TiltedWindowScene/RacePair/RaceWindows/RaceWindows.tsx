import { RaceWindow } from "../RaceWindow/RaceWindow";
import css from "./RaceWindows.module.css";
import type { Rect } from "../../../layout/SceneGeometry";
import type { RaceColumn } from "../../../scenes.types";
import type { useWindowStage } from "../../useWindowStage";
import type { WindowMotion } from "../../WindowMotion/WindowMotion";
import type { Props as RaceInput } from "../RacePair.types";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  pair: [RaceColumn, RaceColumn];
  width: number;
  height: number;
  boxes: Rect[];
  split: number;
  exit: RaceInput["exit"];
  entrance: RaceInput["enter"];
  at: number;
  stage: ReturnType<typeof useWindowStage>;
  tilt: ReturnType<typeof useWindowStage>["tilt"];
  flip: ReturnType<typeof WindowMotion.getFlipSplit> | undefined;
  props: RaceInput;
};
/** Renders race windows. */
export function RaceWindows({
  pair,
  flip,
  tilt,
  ...content
}: Readonly<Props>): ReactNode {
  return (
    <div
      className={css.raceWindowsdiv1}
      style={{
        opacity: flip?.opacity,
        transform: flip
          ? `perspective(${tilt.flipPerspective}px) translateX(${flip.translateX.toFixed(2)}px) rotateY(${flip.rotateY.toFixed(3)}deg)`
          : undefined,
      }}
    >
      {pair.map((column, side) => {
        return (
          <RaceWindow
            key={`${side}-${column.label}`}
            {...content}
            {...{ tilt, column, side }}
          />
        );
      })}
    </div>
  );
}
