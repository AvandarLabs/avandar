import { getSteppedColumnWipeStyle } from "../../../../storyboard/StoryFilm/steppedColumnWipe/steppedColumnWipe";
import { useVideoMotion } from "../../../../videoTheme/useVideoMotion";
import css from "../demos.module.css";
import { MaskDemosShared } from "./MaskDemosShared/MaskDemosShared";
import type { ReactNode } from "react";
/** One mini stage: shot B wiping over shot A, captioned with its options. */
export function SteppedWipeStage({
  wipe,
  frame,
  local,
}: {
  wipe: (typeof MaskDemosShared.WIPES)[number];
  frame: number;
  local: number;
}): ReactNode {
  const motion = useVideoMotion();
  return (
    <div className={css.miniStage}>
      <div className={`${css.miniFrame} ${css.miniFrameTall}`}>
        <div className={`${css.shot} ${css.shotA}`}>A</div>
        {frame >= MaskDemosShared.WIPE_AT ? (
          <div
            className={`${css.shot} ${css.shotB}`}
            style={getSteppedColumnWipeStyle({
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
      <span className={css.caption}>{wipe.code}</span>
    </div>
  );
}
