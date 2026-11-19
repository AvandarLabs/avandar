import { getLineRevealStyle } from "../../../scenes/textReveal";
import css from "./demos.module.css";
import { describeStyle } from "./describeStyle";
import { HelperDemoFrame } from "./HelperDemoFrame/HelperDemoFrame";
import type { HelperDemoProps } from "./helperDemo.types";
import type { ReactNode } from "react";

/** First line's start and the gap between lines, as TypographyScene uses. */
const LINE_AT = 10;
const LINE_STAGGER = 3;

/** Three lines staged with one `getLineRevealStyle()` mode. */
export function createLineRevealDemo(
  mode: "line-fade" | "wipe" | "cut",
): (props: HelperDemoProps) => ReactNode {
  function LineRevealDemo({ frame, frames }: HelperDemoProps): ReactNode {
    const lines = ["Every line arrives", "on its own beat,", "then holds."];
    const styles = lines.map((_, index) => {
      return getLineRevealStyle(frame, LINE_AT + index * LINE_STAGGER, mode);
    });
    return (
      <HelperDemoFrame
        frame={frame}
        frames={frames}
        label={`getLineRevealStyle(frame, ${LINE_AT} + index * ${LINE_STAGGER}, "${mode}")`}
        readouts={[{ name: "line 0", value: describeStyle(styles[0]) }]}
      >
        <div className={css.lines}>
          {lines.map((line, index) => {
            return (
              <p key={line} className={css.headline} style={styles[index]}>
                {line}
              </p>
            );
          })}
        </div>
      </HelperDemoFrame>
    );
  }
  return LineRevealDemo;
}
