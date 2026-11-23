import { TextLayout } from "../../layout/TextLayout";
import { TextReveal } from "../../TextReveal/TextReveal";
import { SceneKicker } from "../SceneKicker/SceneKicker";
import { SceneTitle } from "../SceneTitle/SceneTitle";
import css from "./SceneHeader.module.css";
import type { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import type {
  useVideoTheme,
  useVideoTokens,
} from "../../../videoTheme/videoThemeHelpers";
import type { SceneBase } from "../../scenes.types";
import type { CSSProperties, ReactNode } from "react";

type Props = {
  frame: number;
  width: number;
  title: SceneBase["title"];
  kicker: SceneBase["kicker"];
  headingReveal: SceneBase["headingReveal"];
  tokens: ReturnType<typeof useVideoTokens>;
  spacing: ReturnType<typeof useVideoTheme>["mantine"]["spacing"];
  motion: ReturnType<typeof useVideoMotion>;
};
/** Renders scene header. */
export function SceneHeader({
  frame,
  width,
  title,
  kicker,
  headingReveal,
  tokens,
  spacing,
  motion,
}: Readonly<Props>): ReactNode {
  const heading = tokens.text.stage.sceneHeading;
  const body = tokens.text.stage.sceneBody;
  const reveal = TextReveal.getHeadingRevealStyles({
    frame,
    reveal: headingReveal,
    motion,
  });
  // A wipe clips to the text's own width, not to the header's full width.
  const lineBox: CSSProperties = {
    display: headingReveal?.mode === "wipe" ? "inline-block" : "block",
  };
  const titleSize = title
    ? TextLayout.fitTextLines({
        lines: [title],
        width: width * 0.88,
        height: 74,
        requested: heading.fontSize,
        minimum: TITLE_MIN_FONT_SIZE,
      }).fontSize
    : heading.fontSize;

  return (
    <header className={css.sceneHeaderheader1}>
      {title ? (
        <SceneTitle {...{ title, heading, lineBox, reveal, titleSize }} />
      ) : null}
      {kicker ? (
        <SceneKicker {...{ tokens, spacing, kicker, body, lineBox, reveal }} />
      ) : null}
    </header>
  );
}

/** The smallest fitted scene title, in pixels. */
const TITLE_MIN_FONT_SIZE = 32;
