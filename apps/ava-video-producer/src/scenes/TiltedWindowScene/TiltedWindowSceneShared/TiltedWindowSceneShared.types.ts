import type { TiltedWindowSceneProps } from "../../scenes.types";
/** Inputs shared by the TiltedWindowScene visuals. */
export type SizedProps = TiltedWindowSceneProps & {
  width: number;
  height: number;
};
