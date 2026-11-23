import { useVideoMotion } from "../../../../videoTheme/useVideoMotion";
import { DemoTheme } from "../DemoTheme";
import { getElapsed, START } from "../getElapsed";
import { HelperDemoFrame } from "../HelperDemoFrame/HelperDemoFrame";
import { Ruler } from "../parts/Ruler/Ruler";
import { TimelineTrack } from "../parts/TimelineTrack/TimelineTrack";
import css from "./StaggerDemo.module.css";
import type { HelperDemoProps } from "../helperDemo.types";
import type { ReactNode } from "react";

const SIBLINGS = ["first", "second", "third", "fourth", "fifth", "sixth"];

/** Renders StaggerDemo for live helper catalog previews. */
export function StaggerDemo({ frame, frames }: Readonly<Props>): ReactNode {
  const motion = useVideoMotion();
  const stagger = motion.stagger.list;
  const elapsed = getElapsed(frame);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`enter(frame, ${START} + index * STAGGER)  STAGGER = ${DemoTheme.formatReadout(
        { value: stagger, digits: 1 },
      )}`}
      readouts={[{ name: "elapsed", value: `${elapsed}f` }]}
    >
      <div className={css.staggerDemoTimeline}>
        {SIBLINGS.map((name, index) => {
          return (
            <div key={name} className={css.staggerDemoTimelineRow}>
              <span
                className={css.staggerDemoTimelineName}
                style={motion.enter(frame, START + index * stagger)}
              >
                {`index ${index} @ ${DemoTheme.formatReadout({
                  value: index * stagger,
                  digits: 1,
                })}f`}
              </span>
              <TimelineTrack
                startFrame={index * stagger}
                frames={motion.panel}
                elapsed={elapsed}
              />
            </div>
          );
        })}
        <Ruler />
      </div>
    </HelperDemoFrame>
  );
}

type Props = HelperDemoProps;
