import { useVideoMotion } from "../../../../../videoTheme/useVideoMotion";
import { DemoTheme } from "../../DemoTheme";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import css from "./CountToDemo.module.css";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { ReactNode } from "react";

const COUNT_TARGET = 1280;

/** When the count starts, and how long it takes at tempo 1. */
const COUNT_AT = 15;

const COUNT_FRAMES = 30;

/** A count rising to its final value instead of snapping to it. */
export function CountToDemo({
  frame,
  frames,
}: Readonly<HelperDemoProps>): ReactNode {
  const motion = useVideoMotion();
  const value = motion.count(
    frame,
    COUNT_AT,
    COUNT_TARGET,
    motion.scale(COUNT_FRAMES),
  );
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`motion.count(frame, ${COUNT_AT}, ${COUNT_TARGET}, ${COUNT_FRAMES})`}
      readouts={[
        { name: "value", value: String(value) },
        {
          name: "progress",
          value: DemoTheme.formatReadout({ value: value / COUNT_TARGET }),
        },
      ]}
    >
      <div className={css.countToDemoCentered}>
        <span className={css.countToDemoBigNumber}>
          {value.toLocaleString("en")}
        </span>
      </div>
    </HelperDemoFrame>
  );
}
