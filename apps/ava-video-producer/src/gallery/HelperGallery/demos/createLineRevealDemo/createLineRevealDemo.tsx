import { TextReveal } from "../../../../scenes/TextReveal/TextReveal";
import { useVideoMotion } from "../../../../videoTheme/useVideoMotion";
import { describeStyle } from "../describeStyle";
import { HelperDemoFrame } from "../HelperDemoFrame/HelperDemoFrame";
import css from "./createLineRevealDemo.module.css";
import type { HelperDemoProps } from "../helperDemo.types";
import type { ReactNode } from "react";
/** First line's start, as TypographyScene uses. */
const LINE_AT = 10;
/** Three lines staged with one `getLineRevealStyle()` mode. */
export function createLineRevealDemo(
  mode: "line-fade" | "wipe" | "cut",
): (props: HelperDemoProps) => ReactNode {
  function LineRevealDemo({ frame, frames }: HelperDemoProps): ReactNode {
    const motion = useVideoMotion();
    // The gap between lines is the theme's rise stagger, as TypographyScene
    // uses.
    const lineStagger = motion.rise.stagger;
    const lines = ["Every line arrives", "on its own beat,", "then holds."];
    const styles = lines.map((_, index) => {
      return TextReveal.getLineRevealStyle({
        frame,
        at: LINE_AT + index * lineStagger,
        mode,
        options: {},
        motion,
      });
    });
    return (
      <HelperDemoFrame
        frame={frame}
        frames={frames}
        label={`getLineRevealStyle({ frame, at: ${LINE_AT} + index * ${lineStagger}, mode: "${mode}" })`}
        readouts={[{ name: "line 0", value: describeStyle(styles[0]) }]}
      >
        <div className={css.createLineRevealDemoLines}>
          {lines.map((line, index) => {
            return (
              <p
                key={line}
                className={css.createLineRevealDemoHeadline}
                style={styles[index]}
              >
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
