import clsx from "clsx";
import { DUR } from "../../../motion";
import css from "./demos.module.css";
import { getElapsed } from "./getElapsed";
import { HelperDemoFrame } from "./HelperDemoFrame/HelperDemoFrame";
import { Ruler } from "./parts/Ruler";
import { TimelineTrack } from "./parts/TimelineTrack";
import type { HelperDemoProps } from "./helperDemo.types";
import type { ReactNode } from "react";

/** The duration tokens, shortest first, as the shared timeline lists them. */
const DURATION_ORDER = (Object.keys(DUR) as Array<keyof typeof DUR>).sort(
  (first, second) => {
    return DUR[first] - DUR[second];
  },
);

/** Every `DUR` token on one timeline, with `token` highlighted. */
export function createDurationDemo(
  token: keyof typeof DUR,
): (props: HelperDemoProps) => ReactNode {
  function DurationDemo({ frame, frames }: HelperDemoProps): ReactNode {
    const elapsed = getElapsed(frame);
    return (
      <HelperDemoFrame
        frame={frame}
        frames={frames}
        label={`DUR.${token} = ${DUR[token]}`}
        readouts={[
          { name: "frames", value: String(DUR[token]) },
          { name: "ms", value: String(Math.round((DUR[token] / 30) * 1000)) },
          { name: "elapsed", value: `${elapsed}f` },
        ]}
      >
        <div className={css.timeline}>
          {DURATION_ORDER.map((name) => {
            return (
              <div key={name} className={css.timelineRow}>
                <span
                  className={clsx(
                    css.timelineName,
                    name === token && css.timelineNameActive,
                  )}
                >
                  {`DUR.${name} ${DUR[name]}f`}
                </span>
                <TimelineTrack
                  startFrame={0}
                  frames={DUR[name]}
                  elapsed={elapsed}
                  isActive={name === token}
                />
              </div>
            );
          })}
          <Ruler />
        </div>
      </HelperDemoFrame>
    );
  }
  return DurationDemo;
}
