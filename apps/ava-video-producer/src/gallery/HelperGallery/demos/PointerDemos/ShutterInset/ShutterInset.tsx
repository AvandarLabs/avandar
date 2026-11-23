import { useVideoTheme } from "../../../../../videoTheme/videoThemeHelpers";
import { PointerDemosShared } from "../PointerDemosShared/PointerDemosShared";
import css from "./ShutterInset.module.css";
import type { CursorMotionHelpers } from "../../../../../CursorMotionHelpers";
import type { ReactNode } from "react";

type Props = {
  samples: ReturnType<typeof CursorMotionHelpers.cursorShutter>;
};

/** The shutter samples relative to the pointer, enlarged. */
export function ShutterInset({ samples }: Readonly<Props>): ReactNode {
  const { atomic } = useVideoTheme();
  return (
    <div className={css.shutterInsetInset}>
      {samples.map((sample, index) => {
        return (
          <span
            key={PointerDemosShared.SAMPLE_NAMES[index]}
            className={css.shutterInsetInsetSample}
            style={{
              transform: `translate(${(sample.x * PointerDemosShared.INSET_SCALE).toFixed(1)}px, ${(sample.y * PointerDemosShared.INSET_SCALE).toFixed(1)}px)`,
              opacity: sample.opacity > 0 ? atomic.opacity["60"] : 0,
            }}
          />
        );
      })}
      <span className={css.shutterInsetInsetCenter} />
      <span
        className={css.shutterInsetInsetLabel}
      >{`× ${PointerDemosShared.INSET_SCALE}`}</span>
    </div>
  );
}
