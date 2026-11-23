import { SteppedColumnWipe } from "../../../../../storyboard/StoryFilm/SteppedColumnWipe/SteppedColumnWipe";
import { useVideoMotion } from "../../../../../videoTheme/useVideoMotion";
import { MaskDemosShared } from "../MaskDemosShared/MaskDemosShared";
import css from "./SteppedWipeStage.module.css";
import type { ReactNode } from "react";

type Props = {
  wipe: (typeof MaskDemosShared.WIPES)[number];
  frame: number;
  local: number;
};

/** One mini stage: shot B wiping over shot A, captioned with its options. */
export function SteppedWipeStage({
  wipe,
  frame,
  local,
}: Readonly<Props>): ReactNode {
  const motion = useVideoMotion();
  return (
    <div className={css.steppedWipeStageMiniStage}>
      <div
        className={`${css.steppedWipeStageMiniFrame} ${css.steppedWipeStageMiniFrameTall}`}
      >
        <div
          className={`${css.steppedWipeStageShot} ${css.steppedWipeStageShotA}`}
        >
          A
        </div>
        {frame >= MaskDemosShared.WIPE_AT ? (
          <div
            className={`${css.steppedWipeStageShot} ${css.steppedWipeStageShotB}`}
            style={SteppedColumnWipe.getSteppedColumnWipeStyle({
              frame: local,
              durationInFrames: MaskDemosShared.WIPE_FRAMES,
              options: wipe.options,
              motion,
            })}
          >
            B
          </div>
        ) : null}
      </div>
      <span className={css.steppedWipeStageCaption}>{wipe.code}</span>
    </div>
  );
}
