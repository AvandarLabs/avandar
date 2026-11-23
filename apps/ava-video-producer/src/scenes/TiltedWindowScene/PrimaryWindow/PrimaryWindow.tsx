import { TiltedWindowSceneShared } from "../TiltedWindowSceneShared/TiltedWindowSceneShared";
import { useWindowStage } from "../useWindowStage";
import { WindowMotion } from "../WindowMotion/WindowMotion";
import { makePrimaryWindowStateFromProps } from "./makePrimaryWindowStateFromProps";
import { WindowCarouselCard } from "./WindowCarouselCard";
import type { Props } from "./PrimaryWindow.types";
import type { ReactNode } from "react";

/** The primary window, its carousel, entrance, exit, and camera movement. */
export function PrimaryWindow({
  chrome,
  ...motionProps
}: Readonly<Props>): ReactNode {
  const stage = useWindowStage();
  const state = makePrimaryWindowStateFromProps({ props: motionProps, stage });
  const { windows, carousel, slide } = state;
  return (
    <div
      style={TiltedWindowSceneShared.buildLensStyle({
        lens: state.lens,
        box: state.box,
      })}
    >
      {carousel.previous !== undefined ? (
        <WindowCarouselCard
          key={`window-${carousel.previous}-${windows[carousel.previous].src}`}
          state={state}
          source={windows[carousel.previous]}
          pose={slide.outgoing}
          chrome={chrome}
        />
      ) : undefined}
      {windows.length ? (
        <WindowCarouselCard
          key={`window-${carousel.current}-${windows[carousel.current].src}`}
          state={state}
          source={windows[carousel.current]}
          pose={
            carousel.previous !== undefined
              ? slide.incoming
              : WindowMotion.getRestingPose(stage)
          }
          chrome={chrome}
        />
      ) : undefined}
    </div>
  );
}
