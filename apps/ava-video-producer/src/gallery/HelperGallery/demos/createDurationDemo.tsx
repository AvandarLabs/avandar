import clsx from "clsx";
import { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import css from "./demos.module.css";
import { DemoTheme } from "./DemoTheme";
import { getElapsed } from "./getElapsed";
import { HelperDemoFrame } from "./HelperDemoFrame/HelperDemoFrame";
import { Ruler } from "./parts/Ruler";
import { TimelineTrack } from "./parts/TimelineTrack";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { HelperDemoProps } from "./helperDemo.types";
import type { DemoReadout } from "./HelperDemoFrame/HelperDemoFrame";
import type { ReactNode } from "react";
/** The duration ladder, as `DUR` names it. */
const DURATION_NAMES = [
  "press",
  "chip",
  "whip",
  "panel",
  "sheet",
  "word",
  "hero",
] as const;
/** One step of the duration ladder. */
export type DemoDurationName = (typeof DURATION_NAMES)[number];
/** A step's tempo-scaled length in the theme, in frames. */
function _frames({
  motion,
  name,
}: Readonly<{ motion: VideoMotion; name: DemoDurationName }>): number {
  return name === "press" ? motion.press.duration : motion[name];
}
/** One duration step's name and its track on the timeline. */
function DurationRow({
  name,
  isActive,
  elapsed,
}: {
  name: DemoDurationName;
  isActive: boolean;
  elapsed: number;
}): ReactNode {
  const motion = useVideoMotion();
  const nameFrames = _frames({ motion, name });
  return (
    <div className={css.timelineRow}>
      <span
        className={clsx(css.timelineName, isActive && css.timelineNameActive)}
      >
        {`DUR.${name} ${DemoTheme.formatReadout({ value: nameFrames, digits: 1 })}f`}
      </span>
      <TimelineTrack
        startFrame={0}
        frames={nameFrames}
        elapsed={elapsed}
        isActive={isActive}
      />
    </div>
  );
}
/**
 * Every `DUR` step on one timeline at the video theme's lengths and tempo,
 * shortest first, with `token` highlighted.
 */
export function createDurationDemo(
  token: DemoDurationName,
): (props: HelperDemoProps) => ReactNode {
  function DurationDemo({ frame, frames }: HelperDemoProps): ReactNode {
    const motion = useVideoMotion();
    const elapsed = getElapsed(frame);
    const length = _frames({ motion, name: token });
    const order = [...DURATION_NAMES].sort((first, second) => {
      return (
        _frames({ motion, name: first }) - _frames({ motion, name: second })
      );
    });
    return (
      <HelperDemoFrame
        frame={frame}
        frames={frames}
        label={`DUR.${token} = ${DemoTheme.formatReadout({
          value: length,
          digits: 1,
        })}`}
        readouts={_getDurationReadouts({ length, elapsed })}
      >
        <div className={css.timeline}>
          {order.map((name) => {
            return (
              <DurationRow
                key={name}
                name={name}
                isActive={name === token}
                elapsed={elapsed}
              />
            );
          })}
          <Ruler />
        </div>
      </HelperDemoFrame>
    );
  }
  return DurationDemo;
}

/** Formats the live readouts displayed by DurationDemo. */
function _getDurationReadouts({
  length,
  elapsed,
}: Readonly<{
  length: number;
  elapsed: number;
}>): DemoReadout[] {
  return [
    {
      name: "frames",
      value: DemoTheme.formatReadout({ value: length, digits: 1 }),
    },
    { name: "ms", value: String(Math.round((length / 30) * 1000)) },
    { name: "elapsed", value: `${elapsed}f` },
  ];
}
