import { useVideoMotion } from "../../../../../videoTheme/useVideoMotion";
import { DemoTheme } from "../../DemoTheme";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import css from "./EnterAtDemo.module.css";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { ReactNode } from "react";

const ROWS = ["first", "second", "third", "fourth", "fifth", "sixth"];

/** `enterAt()` walking a list in, `STAGGER` frames apart. */
export function EnterAtDemo({
  frame,
  frames,
}: Readonly<HelperDemoProps>): ReactNode {
  const motion = useVideoMotion();
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label="enterAt(frame, 12, index)"
      readouts={ROWS.slice(0, 3).map((row, index) => {
        return {
          name: `row ${index}`,
          value: DemoTheme.formatReadout({
            value: Number(motion.enterAt(frame, 12, index).opacity),
          }),
        };
      })}
    >
      <div className={css.enterAtDemoList}>
        {ROWS.map((row, index) => {
          return (
            <div
              key={row}
              className={css.enterAtDemoListRow}
              style={motion.enterAt(frame, 12, index)}
            >
              <span className={css.enterAtDemoListDot} />
              <span
                className={css.enterAtDemoListBar}
                style={{ width: 120 + index * 30 }}
              />
            </div>
          );
        })}
      </div>
    </HelperDemoFrame>
  );
}
