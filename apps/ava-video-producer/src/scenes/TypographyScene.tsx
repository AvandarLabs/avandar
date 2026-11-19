import { Img, staticFile } from "remotion";
import { DUR, EASE, mix, ramp } from "../motion";
import {
  assertFrame,
  fitTextLines,
  safePublicPath,
  sceneBounds,
} from "./layout/layout";
import { positioned } from "./positioned";
import { SceneShell } from "./SceneShell";
import {
  getLineRevealStyle,
  getStagedExitStyle,
  getTypographyRevealFrames,
} from "./textReveal";
import type { TypographySceneProps } from "./scenes.types";
import type { ReactNode } from "react";

/** Largest font size a `caption` typography shot uses. */
const CAPTION_FONT_SIZE = 28;
/** Smallest font size a `caption` may shrink to while fitting. */
const CAPTION_MIN_FONT_SIZE = 18;
/** Default icon height above the lines, in pixels. */
const ICON_SIZE = 160;

/**
 * Headline copy for a statement shot: lines revealed word by word through
 * masks, or line by line (fade, left-to-right wipe, or cut), optionally
 * under an icon and leaving in a staged exit. A `caption` size sets one
 * small line, for example a teaser on an empty field.
 */
export function TypographyScene(props: TypographySceneProps): ReactNode {
  const {
    frame,
    width = 1600,
    height = 1000,
    title,
    kicker,
    headingReveal,
    lines,
    align = "center",
    revealAtFrame = 6,
    wordStaggerFrames = 3,
    icon,
    size = "display",
  } = props;
  _validate(props);
  const bounds = sceneBounds(width, height, Boolean(title || kicker));
  const iconSize = icon ? (icon.size ?? ICON_SIZE) : 0;
  const isCaption = size === "caption";
  const fitted = fitTextLines(
    lines,
    bounds.width,
    bounds.height - 56 - (icon ? iconSize + 48 : 0),
    isCaption ? CAPTION_FONT_SIZE : (props.fontSize ?? 92),
    isCaption ? CAPTION_MIN_FONT_SIZE : undefined,
  );
  const isCentered = align === "center";
  const { iconAt = revealAtFrame, linesAt } = getTypographyRevealFrames(
    revealAtFrame,
    icon,
  );
  const wordStarts = _countWordsBefore(fitted.lines);
  return (
    <SceneShell {...{ frame, width, height, title, kicker, headingReveal }}>
      <div
        aria-label={lines.join(" ")}
        style={{
          ...positioned(bounds),
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: isCentered ? "center" : "flex-start",
          gap: fitted.fontSize * 0.15,
        }}
      >
        {icon ? (
          <div
            style={{
              marginBottom: 48,
              ...getStagedExitStyle(frame, props.exit, fitted.lines.length),
            }}
          >
            <Img
              src={staticFile(safePublicPath(icon.src))}
              alt=""
              style={{
                display: "block",
                height: iconSize,
                width: "auto",
                ...getLineRevealStyle(frame, iconAt, "line-fade", {
                  rise: 0,
                }),
              }}
            />
          </div>
        ) : null}
        {fitted.lines.map((line, row) => {
          return (
            <div
              key={row}
              style={{
                maxWidth: "100%",
                ...getStagedExitStyle(frame, props.exit, row),
              }}
            >
              <_TypographyLine
                {...props}
                line={line}
                fontSize={fitted.fontSize}
                isCaption={isCaption}
                isCentered={isCentered}
                revealAt={
                  props.revealMode === undefined ||
                  props.revealMode === "word-mask"
                    ? linesAt + wordStarts[row] * wordStaggerFrames
                    : linesAt + row * (props.lineStaggerFrames ?? 3)
                }
              />
            </div>
          );
        })}
      </div>
    </SceneShell>
  );
}

/** One fitted line, in the scene's reveal mode. */
function _TypographyLine({
  frame,
  line,
  fontSize,
  isCaption,
  isCentered,
  revealAt,
  emphasis = [],
  revealMode = "word-mask",
  wordStaggerFrames = 3,
}: TypographySceneProps & {
  line: string;
  fontSize: number;
  isCaption: boolean;
  isCentered: boolean;
  revealAt: number;
}) {
  const wordStyle = (word: string) => {
    return {
      display: "inline-block",
      fontSize,
      fontWeight: isCaption ? 400 : 600,
      letterSpacing: isCaption ? 0 : -fontSize * 0.025,
      color: emphasis.includes(word)
        ? "var(--brand-strong)"
        : "var(--foreground)",
    };
  };
  const words = line.split(/\s+/);
  if (revealMode !== "word-mask") {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: isCentered ? "center" : "flex-start",
          gap: fontSize * 0.3,
          lineHeight: 1.08,
          paddingBottom: fontSize * 0.07,
          ...getLineRevealStyle(frame, revealAt, revealMode),
        }}
      >
        {words.map((word, index) => {
          return (
            <span key={`${index}-${word}`} style={wordStyle(word)}>
              {word}
            </span>
          );
        })}
      </div>
    );
  }
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isCentered ? "center" : "flex-start",
        gap: fontSize * 0.3,
        maxWidth: "100%",
      }}
    >
      {words.map((word, index) => {
        const progress = ramp(
          frame,
          revealAt + index * wordStaggerFrames,
          DUR.word,
          EASE.word,
        );
        return (
          <span
            key={`${index}-${word}`}
            style={{
              display: "inline-block",
              overflow: "hidden",
              paddingBottom: fontSize * 0.07,
              lineHeight: 1.08,
            }}
          >
            <span
              style={{
                ...wordStyle(word),
                transform: `translateY(${mix(progress, 110, 0).toFixed(2)}%)`,
              }}
            >
              {word}
            </span>
          </span>
        );
      })}
    </div>
  );
}

/** The index of each line's first word across all lines. */
function _countWordsBefore(lines: string[]): number[] {
  return lines.map((_, row) => {
    return lines.slice(0, row).reduce((count, line) => {
      return count + line.split(/\s+/).length;
    }, 0);
  });
}

function _validate({
  lines,
  revealAtFrame = 6,
  wordStaggerFrames = 3,
  size,
  fontSize,
}: TypographySceneProps): void {
  if (
    !lines.length ||
    lines.length > 6 ||
    lines.some((line) => {
      return !line.trim();
    })
  ) {
    throw new Error("TypographyScene needs 1 to 6 nonempty lines");
  }
  assertFrame(revealAtFrame, "revealAtFrame");
  assertFrame(wordStaggerFrames, "wordStaggerFrames");
  if (wordStaggerFrames < 2) {
    throw new Error("wordStaggerFrames must be at least 2");
  }
  if (size === "caption" && fontSize !== undefined) {
    throw new Error("A caption size sets its own font size");
  }
}
