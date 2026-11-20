import { typed } from "../../../motion";
import {
  getHeadingRevealStyles,
  getLineRevealStyle,
  getStagedExitStyle,
  getWipeExitStyle,
} from "../../../scenes/textReveal/textReveal";
import { useWindowStage } from "../../../scenes/TiltedWindowScene/useWindowStage";
import { WindowMotion } from "../../../scenes/TiltedWindowScene/WindowMotion/WindowMotion";
import { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import css from "./demos.module.css";
import { DemoTheme } from "./DemoTheme";
import { describeStyle } from "./describeStyle";
import { HelperDemoFrame } from "./HelperDemoFrame/HelperDemoFrame";
import type { HelperDemoProps } from "./helperDemo.types";
import type { DemoReadout } from "./HelperDemoFrame/HelperDemoFrame";
import type { ReactNode } from "react";

const EXIT_AT = 45;
const EXIT_FRAMES = 12;
/** A wordmark wiped in, then retracted by `getWipeExitStyle()`. */
export function WipeExitDemo({ frame, frames }: HelperDemoProps): ReactNode {
  const motion = useVideoMotion();
  const exit = getWipeExitStyle({
    frame,
    at: EXIT_AT,
    durationInFrames: motion.scale(EXIT_FRAMES),
    motion,
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`getWipeExitStyle({ frame, at: ${EXIT_AT}, durationInFrames: ${EXIT_FRAMES} })`}
      readouts={[{ name: "clipPath", value: String(exit.clipPath) }]}
    >
      <div className={css.centered}>
        <div style={exit}>
          <p
            className={css.headline}
            style={getLineRevealStyle({
              frame,
              at: 8,
              mode: "wipe",
              options: {},
              motion,
            })}
          >
            Motion Atlas
          </p>
        </div>
      </div>
    </HelperDemoFrame>
  );
}
/** One heading reveal mode beside the other. */
const HEADING_MODES = ["rise", "wipe"] as const;
/** Scene headings arriving with the `rise` and `wipe` reveals. */
export function HeadingRevealDemo({
  frame,
  frames,
}: HelperDemoProps): ReactNode {
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
      <div className={css.cards}>
        {HEADING_MODES.map((mode) => {
          const styles = getHeadingRevealStyles({
            frame,
            reveal: { mode, atFrame: 8 },
            motion,
          });
          return (
            <div key={mode} className={css.cardColumn}>
              <span className={css.caption}>{`mode: "${mode}"`}</span>
              <div>
                <p className={css.headline} style={styles.title}>
                  Shared helpers
                </p>
                <p className={css.kicker} style={styles.kicker}>
                  The kicker follows a panel later
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </HelperDemoFrame>
  );
}
const STAGED_EXIT = { atFrame: 50 };
/** A statement leaving line by line, its icon last. */
export function StagedExitDemo({ frame, frames }: HelperDemoProps): ReactNode {
  const motion = useVideoMotion();
  const lines = [
    "The statement leaves",
    "one line at a time,",
    "then its icon.",
  ];
  const iconExit = getStagedExitStyle({
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
      <div className={css.lines} style={motion.enter(frame, 6)}>
        <span className={css.icon} style={iconExit} />
        {lines.map((line, index) => {
          return (
            <p
              key={line}
              className={css.headline}
              style={getStagedExitStyle({
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
const COMMAND = "pnpm showcase";
const TYPED_AT = 10;
/** A command typed character by character with a blinking caret. */
export function TypedDemo({ frame, frames }: HelperDemoProps): ReactNode {
  const motion = useVideoMotion();
  const text = typed(frame, TYPED_AT, COMMAND, motion.typing.rate);
  const isCaretOn = motion.caretOn(frame);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`typed(frame, ${TYPED_AT}, "${COMMAND}") + caretOn(frame)`}
      readouts={[
        { name: "characters", value: `${text.length}/${COMMAND.length}` },
        { name: "caretOn", value: String(isCaretOn) },
      ]}
    >
      <div className={css.centered}>
        <div className={css.terminal}>
          <span className={css.prompt}>$ </span>
          {text}
          <span style={{ opacity: isCaretOn ? 1 : 0 }}>▍</span>
        </div>
      </div>
    </HelperDemoFrame>
  );
}
const HEADLINE_FRAMES = [{ atFrame: 0 }, { atFrame: 30 }, { atFrame: 60 }];
/**
 * Timed headlines replacing one another through
 * `WindowMotion.getActiveHeadline()`.
 */
export function ActiveHeadlineDemo({
  frame,
  frames,
}: HelperDemoProps): ReactNode {
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
  const reveal = getLineRevealStyle({
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
      <div className={css.lines}>
        <div style={{ opacity: active.opacity }}>
          <p className={css.headline} style={reveal}>
            {headlines[active.index]}
          </p>
        </div>
      </div>
    </HelperDemoFrame>
  );
}

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
        getHeadingRevealStyles({
          frame,
          reveal: { mode, atFrame: 8 },
          motion,
        }).title,
      ),
    };
  });
}

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
          getStagedExitStyle({
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
