import { TextReveal } from "../../../../../scenes/TextReveal/TextReveal";
import { useWindowStage } from "../../../../../scenes/TiltedWindowScene/useWindowStage";
import { WindowMotion } from "../../../../../scenes/TiltedWindowScene/WindowMotion/WindowMotion";
import { useVideoMotion } from "../../../../../videoTheme/useVideoMotion";
import { DemoTheme } from "../../DemoTheme";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import css from "./ActiveHeadlineDemo.module.css";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { DemoReadout } from "../../HelperDemoFrame/HelperDemoFrame";
import type { ReactNode } from "react";

const HEADLINE_FRAMES = [{ atFrame: 0 }, { atFrame: 30 }, { atFrame: 60 }];

/** Formats the live readouts displayed by ActiveHeadlineDemo. */
function _getHeadlineReadouts({
  active,
  motion,
}: Readonly<{
  active: ReturnType<typeof WindowMotion.getActiveHeadline>;
  motion: ReturnType<typeof useVideoMotion>;
}>): DemoReadout[] {
  return [
    { name: "index", value: String(active.index) },
    {
      name: "opacity",
      value: DemoTheme.formatReadout({ value: active.opacity }),
    },
    {
      name: "fade",
      value: `${DemoTheme.formatReadout({
        value: motion.press.duration,
        digits: 1,
      })}f`,
    },
  ];
}

/**
 * Timed headlines replacing one another through
 * `WindowMotion.getActiveHeadline()`.
 */
export function ActiveHeadlineDemo({
  frame,
  frames,
}: Readonly<HelperDemoProps>): ReactNode {
  const motion = useVideoMotion();
  const headlines = [
    "Open the record.",
    "Check the change.",
    "Share the answer.",
  ];
  const stage = useWindowStage();
  const active = WindowMotion.getActiveHeadline({
    frame,
    headlines: HEADLINE_FRAMES,
    stage,
  });
  const reveal = TextReveal.getLineRevealStyle({
    frame,
    at: HEADLINE_FRAMES[active.index].atFrame,
    mode: "line-fade",
    options: {},
    motion,
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={
        "WindowMotion.getActiveHeadline({ frame, headlines: [{ atFrame: 0 }, { atFrame: 30 }, { atFrame: 60 }] })"
      }
      readouts={_getHeadlineReadouts({ active, motion })}
    >
      <div className={css.activeHeadlineDemoLines}>
        <div style={{ opacity: active.opacity }}>
          <p className={css.activeHeadlineDemoHeadline} style={reveal}>
            {headlines[active.index]}
          </p>
        </div>
      </div>
    </HelperDemoFrame>
  );
}
