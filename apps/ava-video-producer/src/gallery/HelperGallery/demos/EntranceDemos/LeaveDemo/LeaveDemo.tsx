import { useVideoMotion } from "../../../../../videoTheme/useVideoMotion";
import { DemoTheme } from "../../DemoTheme";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import { DemoCard } from "../../parts/DemoCard/DemoCard";
import css from "./LeaveDemo.module.css";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { ReactNode } from "react";

const LEAVE_AT = 48;

/** A card entering, then `leave()` reversing the same rise. */
export function LeaveDemo({
  frame,
  frames,
}: Readonly<HelperDemoProps>): ReactNode {
  const motion = useVideoMotion();
  const style =
    frame < LEAVE_AT ? motion.enter(frame, 6) : motion.leave(frame, LEAVE_AT);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`leave(frame, ${LEAVE_AT})`}
      readouts={[
        {
          name: "opacity",
          value: DemoTheme.formatReadout({ value: Number(style.opacity) }),
        },
        { name: "transform", value: String(style.transform) },
      ]}
    >
      <div className={css.leaveDemoCentered}>
        <DemoCard title="Draft" style={style} />
      </div>
    </HelperDemoFrame>
  );
}
