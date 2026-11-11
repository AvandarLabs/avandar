import { Trans, useLingui } from "@lingui/react/macro";
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
import { HelperDemoFrame } from "./HelperDemoFrame/HelperDemoFrame";
import type { HelperDemoProps } from "./helperDemo.types";
import type { CSSProperties } from "react";

/** First line's start and the gap between lines, as TypographyScene uses. */
const LINE_AT = 10;
const LINE_STAGGER = 3;

/** The style value a line reveal mode changes, for the readout. */
function _describeStyle(style: CSSProperties): string {
  return style.clipPath
    ? `clipPath ${String(style.clipPath)}`
    : `opacity ${formatReadout(Number(style.opacity ?? 1))}`;
}

/** Three lines staged with one `getLineRevealStyle()` mode. */
export function createLineRevealDemo(mode: "line-fade" | "wipe" | "cut") {
  return function LineRevealDemo({ frame, frames }: HelperDemoProps) {
    const { t } = useLingui();
    const lines = [t`Every line arrives`, t`on its own beat,`, t`then holds.`];
    const styles = lines.map((_, index) =>
      getLineRevealStyle(frame, LINE_AT + index * LINE_STAGGER, mode),
    );
    return (
      <HelperDemoFrame
        frame={frame}
        frames={frames}
        label={`getLineRevealStyle(frame, ${LINE_AT} + index * ${LINE_STAGGER}, "${mode}")`}
        readouts={[{ name: "line 0", value: _describeStyle(styles[0]) }]}
      >
        <div className={css.lines}>
          {lines.map((line, index) => (
            <p key={line} className={css.headline} style={styles[index]}>
              {line}
            </p>
          ))}
        </div>
      </HelperDemoFrame>
    );
  };
}

const EXIT_AT = 45;
const EXIT_FRAMES = 12;

/** A wordmark wiped in, then retracted by `getWipeExitStyle()`. */
export function WipeExitDemo({ frame, frames }: HelperDemoProps) {
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
            <Trans>Motion Atlas</Trans>
          </p>
        </div>
      </div>
    </HelperDemoFrame>
  );
}

/** One heading reveal mode beside the other. */
const HEADING_MODES = ["rise", "wipe"] as const;

/** Scene headings arriving with the `rise` and `wipe` reveals. */
export function HeadingRevealDemo({ frame, frames }: HelperDemoProps) {
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label="getHeadingRevealStyles(frame, { mode, atFrame: 8 })"
      readouts={HEADING_MODES.map((mode) => ({
        name: `${mode} title`,
        value: _describeStyle(
          getHeadingRevealStyles(frame, { mode, atFrame: 8 }).title,
        ),
      }))}
    >
      <div className={css.cards}>
        {HEADING_MODES.map((mode) => {
          const styles = getHeadingRevealStyles(frame, { mode, atFrame: 8 });
          return (
            <div key={mode} className={css.cardColumn}>
              <span className={css.caption}>{`mode: "${mode}"`}</span>
              <div>
                <p className={css.headline} style={styles.title}>
                  <Trans>Shared helpers</Trans>
                </p>
                <p className={css.kicker} style={styles.kicker}>
                  <Trans>The kicker follows a panel later</Trans>
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
export function StagedExitDemo({ frame, frames }: HelperDemoProps) {
  const { t } = useLingui();
  const lines = [
    t`The statement leaves`,
    t`one line at a time,`,
    t`then its icon.`,
  ];
  const iconExit = getStagedExitStyle(frame, STAGED_EXIT, lines.length);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label="getStagedExitStyle(frame, { atFrame: 50 }, orderIndex)"
      readouts={[0, 1, 2, 3].map((index) => ({
        name: index === 3 ? "icon" : `line ${index}`,
        value: formatReadout(
          Number(getStagedExitStyle(frame, STAGED_EXIT, index).opacity ?? 1),
        ),
      }))}
    >
      <div className={css.lines} style={enter(frame, 6)}>
        <span className={css.icon} style={iconExit} />
        {lines.map((line, index) => (
          <p
            key={line}
            className={css.headline}
            style={getStagedExitStyle(frame, STAGED_EXIT, index)}
          >
            {line}
          </p>
        ))}
      </div>
    </HelperDemoFrame>
  );
}

const COMMAND = "pnpm showcase";
const TYPED_AT = 10;

/** A command typed character by character with a blinking caret. */
export function TypedDemo({ frame, frames }: HelperDemoProps) {
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
export function ActiveHeadlineDemo({ frame, frames }: HelperDemoProps) {
  const { t } = useLingui();
  const headlines = [
    t`Open the record.`,
    t`Check the change.`,
    t`Share the answer.`,
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
