import { CursorMotionHelpers } from "../../../../CursorMotionHelpers";
import { useVideoTheme } from "../../../../videoTheme/useVideoTheme";
import css from "../demos.module.css";
import { PointerDemosShared } from "./PointerDemosShared/PointerDemosShared";
import type { ReactNode } from "react";
/** The shutter samples relative to the pointer, enlarged. */
export function ShutterInset({
  samples,
}: {
  samples: ReturnType<typeof CursorMotionHelpers.cursorShutter>;
}): ReactNode {
  const { atomic } = useVideoTheme();
  return (
    <div className={css.inset}>
      {samples.map((sample, index) => {
        return (
          <span
            key={PointerDemosShared.SAMPLE_NAMES[index]}
            className={css.insetSample}
            style={{
              transform: `translate(${(sample.x * PointerDemosShared.INSET_SCALE).toFixed(1)}px, ${(sample.y * PointerDemosShared.INSET_SCALE).toFixed(1)}px)`,
              opacity: sample.opacity > 0 ? atomic.opacity["60"] : 0,
            }}
          />
        );
      })}
      <span className={css.insetCenter} />
      <span
        className={css.insetLabel}
      >{`× ${PointerDemosShared.INSET_SCALE}`}</span>
    </div>
  );
}
