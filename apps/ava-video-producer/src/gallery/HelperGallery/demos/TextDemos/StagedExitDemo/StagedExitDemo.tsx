import { TextReveal } from "../../../../../scenes/TextReveal/TextReveal";
import { useVideoMotion } from "../../../../../videoTheme/useVideoMotion";
import { DemoTheme } from "../../DemoTheme";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import css from "./StagedExitDemo.module.css";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { DemoReadout } from "../../HelperDemoFrame/HelperDemoFrame";
import type { ReactNode } from "react";

const STAGED_EXIT = { atFrame: 50 };

/** Formats the live readouts displayed by StagedExitDemo. */
function _getStagedExitReadouts({
  frame,
  motion,
}: Readonly<{
  frame: number;
  motion: ReturnType<typeof useVideoMotion>;
}>): DemoReadout[] {
  return [0, 1, 2, 3].map((index) => {
    return {
      name: index === 3 ? "icon" : `line ${index}`,
      value: DemoTheme.formatReadout({
        value: Number(
          TextReveal.getStagedExitStyle({
            frame,
            exit: STAGED_EXIT,
            orderIndex: index,
            motion,
          }).opacity ?? 1,
        ),
      }),
    };
  });
}

/** A statement leaving line by line, its icon last. */
export function StagedExitDemo({
  frame,
  frames,
}: Readonly<HelperDemoProps>): ReactNode {
  const motion = useVideoMotion();
  const lines = [
    "The statement leaves",
    "one line at a time,",
    "then its icon.",
  ];
  const iconExit = TextReveal.getStagedExitStyle({
    frame,
    exit: STAGED_EXIT,
    orderIndex: lines.length,
    motion,
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={"getStagedExitStyle({ frame, exit: { atFrame: 50 }, orderIndex })"}
      readouts={_getStagedExitReadouts({ frame, motion })}
    >
      <div className={css.stagedExitDemoLines} style={motion.enter(frame, 6)}>
        <span className={css.stagedExitDemoIcon} style={iconExit} />
        {lines.map((line, index) => {
          return (
            <p
              key={line}
              className={css.stagedExitDemoHeadline}
              style={TextReveal.getStagedExitStyle({
                frame,
                exit: STAGED_EXIT,
                orderIndex: index,
                motion,
              })}
            >
              {line}
            </p>
          );
        })}
      </div>
    </HelperDemoFrame>
  );
}
