import { Img, staticFile } from "remotion";
import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import { useVideoTheme } from "../../videoTheme/useVideoTheme";
import {
  assertFrame,
  fitTextLines,
  safePublicPath,
  sceneBounds,
} from "../layout/layout";
import { positioned } from "../positioned";
import { SceneShell } from "../SceneShell";
import {
  getLineRevealStyle,
  getStagedExitStyle,
  getTypographyRevealFrames,
} from "../textReveal/textReveal";
import { TypographyLine } from "./TypographyLine";
import type { TypographySceneProps as Props } from "../scenes.types";
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
export function TypographyScene(props: Props): ReactNode {
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
  const motion = useVideoMotion();
  const { spacing } = useVideoTheme().mantine;
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
  const { iconAt = revealAtFrame, linesAt } = getTypographyRevealFrames({
    revealAtFrame,
    icon,
    motion,
  });
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
              marginBottom: spacing["48"],
              ...getStagedExitStyle({
                frame,
                exit: props.exit,
                orderIndex: fitted.lines.length,
                motion,
              }),
            }}
          >
            <Img
              src={staticFile(safePublicPath(icon.src))}
              alt=""
              style={{
                display: "block",
                height: iconSize,
                width: "auto",
                ...getLineRevealStyle({
                  frame,
                  at: iconAt,
                  mode: "line-fade",
                  options: { rise: 0 },
                  motion,
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
                ...getStagedExitStyle({
                  frame,
                  exit: props.exit,
                  orderIndex: row,
                  motion,
                }),
              }}
            >
              <TypographyLine
                {...props}
                line={line}
                fontSize={fitted.fontSize}
                isCaption={isCaption}
                isCentered={isCentered}
                revealAt={
                  props.revealMode === undefined ||
                  props.revealMode === "word-mask"
                    ? linesAt + wordStarts[row] * wordStaggerFrames
                    : linesAt +
                      row * (props.lineStaggerFrames ?? motion.rise.stagger)
                }
              />
            </div>
          );
        })}
      </div>
    </SceneShell>
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
}: Props): void {
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
