import { useWindowStage } from "../../../../../scenes/TiltedWindowScene/useWindowStage";
import { WindowMotion } from "../../../../../scenes/TiltedWindowScene/WindowMotion/WindowMotion";
import { type CarouselWindow } from "../../../../../scenes/TiltedWindowScene/WindowMotion/WindowMotion.types";
import { WINDOW_BOX } from "../../../../../scenes/TiltedWindowScene/windowTilt";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import { DemoCanvas } from "../../parts/DemoCanvas/DemoCanvas";
import { getCanvasRect } from "../../parts/getCanvasRect";
import { TiltedDemoWindow } from "../../parts/TiltedDemoWindow/TiltedDemoWindow";
import { WindowDemoReadouts } from "../WindowDemoReadouts";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { ReactNode } from "react";

const BOX = getCanvasRect(WINDOW_BOX);

const CAROUSEL: CarouselWindow[] = [
  {},
  { atFrame: 30, swap: "slide" },
  { atFrame: 60, swap: "slide" },
];

/** Renders CarouselDemo for live helper catalog previews. */
export function CarouselDemo({ frame, frames }: Readonly<Props>): ReactNode {
  const stage = useWindowStage();
  const state = WindowMotion.getCarouselState({
    frame,
    windows: CAROUSEL,
    stage,
  });
  const poses = WindowMotion.getCarouselPoses({
    progress: state.progress,
    box: BOX,
    stage,
  });
  const isSliding = state.previous !== undefined;
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={
        'WindowMotion.getCarouselState({ frame, windows: [{}, { atFrame: 30, swap: "slide" }, { atFrame: 60, swap: "slide" }] })'
      }
      readouts={WindowDemoReadouts.getCarouselReadouts({
        state,
        poses,
        isSliding,
      })}
    >
      <DemoCanvas>
        {isSliding ? (
          <TiltedDemoWindow
            box={BOX}
            pose={poses.outgoing}
            variant={(state.previous ?? 0) as 0 | 1 | 2}
          />
        ) : null}
        <TiltedDemoWindow
          box={BOX}
          pose={isSliding ? poses.incoming : WindowMotion.getRestingPose(stage)}
          variant={state.current as 0 | 1 | 2}
        />
      </DemoCanvas>
    </HelperDemoFrame>
  );
}

type Props = HelperDemoProps;
