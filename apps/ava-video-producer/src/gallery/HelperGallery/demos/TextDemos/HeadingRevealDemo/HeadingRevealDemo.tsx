import { TextReveal } from "../../../../../scenes/TextReveal/TextReveal";
import { useVideoMotion } from "../../../../../videoTheme/useVideoMotion";
import { describeStyle } from "../../describeStyle";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import css from "./HeadingRevealDemo.module.css";
import { HeadingRevealPanel } from "./HeadingRevealPanel/HeadingRevealPanel";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { DemoReadout } from "../../HelperDemoFrame/HelperDemoFrame";
import type { ReactNode } from "react";

/** One heading reveal mode beside the other. */
const HEADING_MODES = ["rise", "wipe"] as const;

/** Formats the live readouts displayed by HeadingRevealDemo. */
function _getHeadingReadouts({
  frame,
  motion,
}: Readonly<{
  frame: number;
  motion: ReturnType<typeof useVideoMotion>;
}>): DemoReadout[] {
  return HEADING_MODES.map((mode) => {
    return {
      name: `${mode} title`,
      value: describeStyle(
        TextReveal.getHeadingRevealStyles({
          frame,
          reveal: { mode, atFrame: 8 },
          motion,
        }).title,
      ),
    };
  });
}

/** Scene headings arriving with the `rise` and `wipe` reveals. */
export function HeadingRevealDemo({
  frame,
  frames,
}: Readonly<HelperDemoProps>): ReactNode {
  const motion = useVideoMotion();
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={
        "getHeadingRevealStyles({ frame, reveal: { mode, atFrame: 8 }, motion })"
      }
      readouts={_getHeadingReadouts({ frame, motion })}
    >
      <div className={css.headingRevealDemoCards}>
        {HEADING_MODES.map((mode) => {
          return (
            <HeadingRevealPanel
              key={mode}
              mode={mode}
              frame={frame}
              motion={motion}
            />
          );
        })}
      </div>
    </HelperDemoFrame>
  );
}
