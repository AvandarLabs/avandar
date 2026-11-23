import { SteppedColumnWipe } from "../../../../../storyboard/StoryFilm/SteppedColumnWipe/SteppedColumnWipe";
import { useVideoMotion } from "../../../../../videoTheme/useVideoMotion";
import { DemoTheme } from "../../DemoTheme";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import { MaskDemosShared } from "../MaskDemosShared/MaskDemosShared";
import { SteppedWipeStage } from "../SteppedWipeStage/SteppedWipeStage";
import css from "./SteppedColumnWipeDemo.module.css";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { DemoReadout } from "../../HelperDemoFrame/HelperDemoFrame";
import type { ReactNode } from "react";

/** Formats the live readouts displayed by SteppedColumnWipeDemo. */
function _getColumnWipeReadouts(progress: readonly number[]): DemoReadout[] {
  return [
    {
      name: "column 0",
      value: DemoTheme.formatReadout({ value: progress[0] }),
    },
    {
      name: "column 7",
      value: DemoTheme.formatReadout({ value: progress[7] }),
    },
  ];
}

/** The stepped column wipe revealing shot B over shot A. */
export function SteppedColumnWipeDemo({
  frame,
  frames,
}: Readonly<HelperDemoProps>): ReactNode {
  const motion = useVideoMotion();
  const local = Math.max(0, frame - MaskDemosShared.WIPE_AT);
  const progress = SteppedColumnWipe.getColumnWipeProgress({
    frame: local,
    durationInFrames: MaskDemosShared.WIPE_FRAMES,
    options: MaskDemosShared.WIPES[0].options,
    motion,
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`SteppedColumnWipe.getSteppedColumnWipeStyle({ frame: frame - ${MaskDemosShared.WIPE_AT}, durationInFrames: ${MaskDemosShared.WIPE_FRAMES}, options })`}
      readouts={_getColumnWipeReadouts(progress)}
    >
      <div
        className={`${css.steppedColumnWipeDemoMiniStages} ${css.steppedColumnWipeDemoTwoUp}`}
      >
        {MaskDemosShared.WIPES.map((wipe) => {
          return (
            <SteppedWipeStage
              key={wipe.code}
              wipe={wipe}
              frame={frame}
              local={local}
            />
          );
        })}
      </div>
    </HelperDemoFrame>
  );
}
