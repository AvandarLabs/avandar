import { DUR, caretOn, enter, typed } from "../../../motion";
import {
  getHeadingRevealStyles,
  getLineRevealStyle,
  getStagedExitStyle,
  getWipeExitStyle,
} from "../../../scenes/textReveal";
import { getActiveHeadline } from "../../../scenes/TiltedWindowScene/windowMotion";
import css from "./demos.module.css";
import { formatReadout } from "./demoTheme";
import { describeStyle } from "./describeStyle";
import { HelperDemoFrame } from "./HelperDemoFrame/HelperDemoFrame";
import type { HelperDemoProps } from "./helperDemo.types";
import type { ReactNode } from "react";

const EXIT_AT = 45;
const EXIT_FRAMES = 12;

/** A wordmark wiped in, then retracted by `getWipeExitStyle()`. */
export function WipeExitDemo({ frame, frames }: HelperDemoProps): ReactNode {
  const exit = getWipeExitStyle(frame, EXIT_AT, EXIT_FRAMES);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`getWipeExitStyle(frame, ${EXIT_AT}, ${EXIT_FRAMES})`}
      readouts={[{ name: "clipPath", value: String(exit.clipPath) }]}
    >
      <div className={css.centered}>
        <div style={exit}>
          <p
            className={css.headline}
            style={getLineRevealStyle(frame, 8, "wipe")}
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
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label="getHeadingRevealStyles(frame, { mode, atFrame: 8 })"
      readouts={HEADING_MODES.map((mode) => {
        return {
          name: `${mode} title`,
          value: describeStyle(
            getHeadingRevealStyles(frame, { mode, atFrame: 8 }).title,
          ),
        };
      })}
    >
      <div className={css.cards}>
        {HEADING_MODES.map((mode) => {
          const styles = getHeadingRevealStyles(frame, { mode, atFrame: 8 });
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
  const lines = [
    "The statement leaves",
    "one line at a time,",
    "then its icon.",
  ];
  const iconExit = getStagedExitStyle(frame, STAGED_EXIT, lines.length);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label="getStagedExitStyle(frame, { atFrame: 50 }, orderIndex)"
      readouts={[0, 1, 2, 3].map((index) => {
        return {
          name: index === 3 ? "icon" : `line ${index}`,
          value: formatReadout(
            Number(getStagedExitStyle(frame, STAGED_EXIT, index).opacity ?? 1),
          ),
        };
      })}
    >
      <div className={css.lines} style={enter(frame, 6)}>
        <span className={css.icon} style={iconExit} />
        {lines.map((line, index) => {
          return (
            <p
              key={line}
              className={css.headline}
              style={getStagedExitStyle(frame, STAGED_EXIT, index)}
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
  const text = typed(frame, TYPED_AT, COMMAND);
  const isCaretOn = caretOn(frame);
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

/** Timed headlines replacing one another through `getActiveHeadline()`. */
export function ActiveHeadlineDemo({
  frame,
  frames,
}: HelperDemoProps): ReactNode {
  const headlines = [
    "Open the record.",
    "Check the change.",
    "Share the answer.",
  ];
  const active = getActiveHeadline(frame, HEADLINE_FRAMES);
  const reveal = getLineRevealStyle(
    frame,
    HEADLINE_FRAMES[active.index].atFrame,
    "line-fade",
  );
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label="getActiveHeadline(frame, [{ atFrame: 0 }, { atFrame: 30 }, { atFrame: 60 }])"
      readouts={[
        { name: "index", value: String(active.index) },
        { name: "opacity", value: formatReadout(active.opacity) },
        { name: "fade", value: `${DUR.press}f` },
      ]}
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
