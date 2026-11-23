import { FRAME_WIDTH, RULER_FRAMES } from "../../getElapsed";
import css from "./Ruler.module.css";
import type { ReactNode } from "react";

type Props = {
  frameWidth?: number;
  frames?: number;
};

/** A frame ruler under the shared timeline, labelled every 5 frames. */
export function Ruler({
  frameWidth = FRAME_WIDTH,
  frames = RULER_FRAMES,
}: Readonly<Props>): ReactNode {
  return (
    <div className={css.rulerTimelineRow}>
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
