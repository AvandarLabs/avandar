import { useWindowStage } from "../useWindowStage";
import { WindowMotion } from "../WindowMotion/WindowMotion";
import { PAIR_BOXES } from "../windowTilt";
import type { Props } from "./RacePair.types";
import type { RaceWindows } from "./RaceWindows/RaceWindows";
import type { ComponentProps } from "react";
/** Samples the shared race layout and its single window-stage hook. */
export function useRacePairState({
  props,
}: Readonly<{ props: Props }>): ComponentProps<typeof RaceWindows> {
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
  return {
    frame,
    pair,
    width,
    height,
    entrance,
    exit,
    stage,
    tilt,
    at,
    flip,
    split,
    boxes,
    props,
  };
}
