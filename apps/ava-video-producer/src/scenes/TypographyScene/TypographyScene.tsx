import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import { useVideoTheme } from "../../videoTheme/videoThemeHelpers";
import { SceneGeometry } from "../layout/SceneGeometry";
import { TextLayout } from "../layout/TextLayout";
import { SceneShell } from "../SceneShell/SceneShell";
import { TextReveal } from "../TextReveal/TextReveal";
import { TypographyContent } from "./TypographyContent/TypographyContent";
import type { Rect } from "../layout/SceneGeometry";
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
export function TypographyScene({
  lines,
  ...scene
}: Readonly<Props>): ReactNode {
  const props = { lines, ...scene };
  const {
    frame,
    width = 1600,
    height = 1000,
    title,
    kicker,
    headingReveal,
    align = "center",
    revealAtFrame = 6,
    wordStaggerFrames = 3,
    icon,
    size = "display",
  } = props;
  _validate(props);
  const motion = useVideoMotion();
  const { spacing } = useVideoTheme().mantine;
  const input = {
    ...props,
    width,
    height,
    align,
    revealAtFrame,
    wordStaggerFrames,
    size,
  };
  const layout = _getTypographyLayoutFromScene({ input, motion });
  return (
    <SceneShell {...{ frame, width, height, title, kicker, headingReveal }}>
      <TypographyContent
        {...layout}
        {...{ frame, props, lines, motion, spacing, icon, wordStaggerFrames }}
      />
    </SceneShell>
  );
}
/** The index of each line's first word across all lines. */
function _countWordsBefore(lines: string[]): number[] {
  return lines.map((_, row) => {
    return lines.slice(0, row).reduce((numWords, line) => {
      return numWords + line.split(/\s+/).length;
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
  SceneGeometry.assertFrame({
    value: revealAtFrame,
    name: "revealAtFrame",
  });
  SceneGeometry.assertFrame({
    value: wordStaggerFrames,
    name: "wordStaggerFrames",
  });
  if (wordStaggerFrames < 2) {
    throw new Error("wordStaggerFrames must be at least 2");
  }
  if (size === "caption" && fontSize !== undefined) {
    throw new Error("A caption size sets its own font size");
  }
}

type TypographyInput = Props &
  Required<
    Pick<
      Props,
      | "width"
      | "height"
      | "align"
      | "revealAtFrame"
      | "wordStaggerFrames"
      | "size"
    >
  >;
type TypographyLayout = {
  bounds: Rect;
  iconSize: number;
  isCaption: boolean;
  fitted: ReturnType<typeof TextLayout.fitTextLines>;
  isCentered: boolean;
  iconAt: number;
  linesAt: number;
  wordStarts: number[];
};
/** Fits statement copy, icon space and staged reveal offsets together. */
function _getTypographyLayoutFromScene({
  input,
  motion,
}: Readonly<{
  input: TypographyInput;
  motion: ReturnType<typeof useVideoMotion>;
}>): TypographyLayout {
  const bounds = SceneGeometry.sceneBounds({
    width: input.width,
    height: input.height,
    hasHeading: Boolean(input.title || input.kicker),
  });
  const iconSize = input.icon ? (input.icon.size ?? ICON_SIZE) : 0;
  const isCaption = input.size === "caption";
  const fitted = TextLayout.fitTextLines({
    lines: input.lines,
    width: bounds.width,
    height: bounds.height - 56 - (input.icon ? iconSize + 48 : 0),
    requested: isCaption ? CAPTION_FONT_SIZE : (input.fontSize ?? 92),
    minimum: isCaption ? CAPTION_MIN_FONT_SIZE : undefined,
  });
  const isCentered = input.align === "center";
  const { iconAt = input.revealAtFrame, linesAt } =
    TextReveal.getTypographyRevealFrames({
      revealAtFrame: input.revealAtFrame,
      icon: input.icon,
      motion,
    });
  const wordStarts = _countWordsBefore(fitted.lines);
  return {
    bounds,
    iconSize,
    isCaption,
    fitted,
    isCentered,
    iconAt,
    linesAt,
    wordStarts,
  };
}
