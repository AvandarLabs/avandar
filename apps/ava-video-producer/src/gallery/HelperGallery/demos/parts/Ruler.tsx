import css from "../demos.module.css";
import { FRAME_WIDTH, RULER_FRAMES } from "../getElapsed";
import type { ReactNode } from "react";

/** A frame ruler under the shared timeline, labelled every 5 frames. */
export function Ruler({
  frameWidth = FRAME_WIDTH,
  frames = RULER_FRAMES,
}: {
  frameWidth?: number;
  frames?: number;
}): ReactNode {
  return (
    <div className={css.timelineRow}>
      <span />
      <div className={css.ruler}>
        {Array.from({ length: frames + 1 }, (_, index) => {
          return (
            <span key={`tick-${index * frameWidth}`}>
              <span
                className={css.rulerTick}
                style={{ left: index * frameWidth }}
              />
              {index % 5 === 0 ? (
                <span
                  className={css.rulerLabel}
                  style={{ left: index * frameWidth }}
                >
                  {index}f
                </span>
              ) : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}
