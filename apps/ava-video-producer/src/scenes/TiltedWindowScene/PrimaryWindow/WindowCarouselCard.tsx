import { TiltedWindowSceneShared } from "../TiltedWindowSceneShared/TiltedWindowSceneShared";
import { WindowCard } from "../WindowCard";
import type { WindowPose } from "../WindowMotion/WindowMotion.types";
import type {
  PrimaryWindowState,
  Props as PrimaryWindowProps,
} from "./PrimaryWindow.types";
import type { ReactNode } from "react";

type Props = {
  state: PrimaryWindowState;
  source: PrimaryWindowState["windows"][number];
  pose: WindowPose;
  chrome: PrimaryWindowProps["chrome"];
};

/** Draws one carousel source with the primary window's camera and base pose. */
export function WindowCarouselCard({
  state,
  source,
  pose,
  chrome,
}: Readonly<Props>): ReactNode {
  return (
    <WindowCard
      frame={state.frame}
      rect={state.pullBack?.rect ?? state.box}
      pose={TiltedWindowSceneShared.combinePoses(
        state.base,
        pose,
        state.lens?.blurX ?? 0,
      )}
      source={source}
      canvasHeight={state.height}
      tilt={state.pullBack?.tilt ?? 1}
      chrome={chrome}
      clipPath={state.clipPath}
    />
  );
}
