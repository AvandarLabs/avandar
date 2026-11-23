import { useWindowStage } from "../../../../../scenes/TiltedWindowScene/useWindowStage";
import { WindowMotion } from "../../../../../scenes/TiltedWindowScene/WindowMotion/WindowMotion";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import { DEMO_CANVAS, DemoCanvas } from "../../parts/DemoCanvas/DemoCanvas";
import { SplitPair } from "../SplitPair/SplitPair";
import { WindowDemoReadouts } from "../WindowDemoReadouts";
import css from "./FlipSplitDemo.module.css";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { ReactNode } from "react";

const FLIP_AT = 8;

/** Renders FlipSplitDemo for live helper catalog previews. */
export function FlipSplitDemo({ frame, frames }: Readonly<Props>): ReactNode {
  const stage = useWindowStage();
  const flip = WindowMotion.getFlipSplit({
    frame,
    at: FLIP_AT,
    canvasWidth: DEMO_CANVAS.width,
    stage,
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`WindowMotion.getFlipSplit({ frame, at: ${FLIP_AT}, canvasWidth })`}
      readouts={WindowDemoReadouts.getFlipReadouts(flip)}
    >
      <DemoCanvas>
        <div
          className={css.flipSplitDemoLayer}
          style={{
            opacity: flip.opacity,
            transform: `perspective(${stage.tilt.flipPerspective}px) translateX(${flip.translateX.toFixed(2)}px) rotateY(${flip.rotateY.toFixed(3)}deg)`,
          }}
        >
          <SplitPair split={flip.split} />
        </div>
      </DemoCanvas>
    </HelperDemoFrame>
  );
}

type Props = HelperDemoProps;
