import { TiltedWindowSceneShared } from "./TiltedWindowSceneShared/TiltedWindowSceneShared";
import { type SizedProps } from "./TiltedWindowSceneShared/TiltedWindowSceneShared.types";
import { useWindowStage } from "./useWindowStage";
import { WindowCard } from "./WindowCard";
import { WindowMotion } from "./WindowMotion/WindowMotion";
import type { TiltedWindowSceneProps } from "../scenes.types";
import type { ReactNode } from "react";

type SecondaryWindowOptions = SizedProps & {
  secondary: NonNullable<TiltedWindowSceneProps["secondary"]>;
};
/** The small second window, whipping in on its cue and out on the exit. */
export function SecondaryWindow({
  frame,
  width,
  height,
  exit,
  secondary,
  chrome,
}: SecondaryWindowOptions): ReactNode {
  const stage = useWindowStage();
  const canvas = { width, height };
  const rect = TiltedWindowSceneShared.toPixels(secondary.box, canvas);
  return (
    <WindowCard
      frame={frame}
      rect={rect}
      pose={
        exit && frame >= exit.atFrame
          ? WindowMotion.getWhipExit({
              frame,
              at: exit.atFrame,
              box: rect,
              durationInFrames: exit.durationInFrames,
              stage,
            })
          : WindowMotion.getWhipEntrance({
              frame,
              at: secondary.atFrame,
              canvas,
              box: rect,
              durationInFrames: undefined,
              stage,
            })
      }
      source={secondary}
      canvasHeight={height}
      chrome={chrome}
    />
  );
}
