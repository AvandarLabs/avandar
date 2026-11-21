import type { RaceColumn, TiltedWindowSceneProps } from "../../scenes.types";

export type Props = TiltedWindowSceneProps & {
  pair: [RaceColumn, RaceColumn];
  width: number;
  height: number;
};
