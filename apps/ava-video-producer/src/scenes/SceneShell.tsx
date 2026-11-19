import { useVideoMotion } from "../videoTheme/useVideoMotion";
import { useVideoTheme, useVideoTokens } from "../videoTheme/useVideoTheme";
import { assertFinite, fitTextLines } from "./layout/layout";
import { getStageTextStyle } from "./stageTheme/stageTheme";
import { getHeadingRevealStyles } from "./textReveal";
import type { SceneBase } from "./scenes.types";
import type { CSSProperties, ReactNode } from "react";

/** The smallest a scene title shrinks to while fitting, in pixels. */
const TITLE_MIN_FONT_SIZE = 32;

/**
 * Shared chrome for a scene: the ground, title/kicker header, and content area.
 * The title is `text.stage.sceneHeading` fitted to the header, the kicker
 * `text.stage.sceneBody` in the muted foreground, on the scene palette.
 */
export function SceneShell({
  frame,
  width = 1600,
  height = 1000,
  title,
  kicker,
  headingReveal,
  children,
}: SceneBase & { children: ReactNode }): ReactNode {
  assertFinite(frame, "scene frame");
  const tokens = useVideoTokens();
  const { spacing } = useVideoTheme().mantine;
  const motion = useVideoMotion();
  const heading = tokens.text.stage.sceneHeading;
  const body = tokens.text.stage.sceneBody;
  const reveal = getHeadingRevealStyles(frame, headingReveal, motion);
  // A wipe clips to the text's own width, not to the header's full width.
  const lineBox: CSSProperties = {
    display: headingReveal?.mode === "wipe" ? "inline-block" : "block",
  };
  const titleSize = title
    ? fitTextLines(
        [title],
        width * 0.88,
        74,
        heading.fontSize,
        TITLE_MIN_FONT_SIZE,
      ).fontSize
    : heading.fontSize;
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        width,
        height,
        overflow: "hidden",
        background: tokens.color.scene.ground,
        color: tokens.color.scene.foreground,
        fontFamily: heading.fontFamily,
      }}
    >
      {title || kicker ? (
        <header
          style={{ position: "absolute", left: "6%", right: "6%", top: 64 }}
        >
          {title ? (
            <h1
              style={{
                margin: 0,
                ...getStageTextStyle(heading, ["fontWeight", "lineHeight"]),
                fontSize: titleSize,
                // The role's tracking at the role's own size, so a fitted
                // title keeps the same tracking in pixels at any size.
                letterSpacing: (heading.letterSpacing ?? 0) * heading.fontSize,
              }}
            >
              <span style={{ ...lineBox, ...reveal.title }}>{title}</span>
            </h1>
          ) : null}
          {kicker ? (
            <p
              style={{
                margin: `${spacing["2xs"]} 0 0`,
                maxWidth: "100%",
                ...getStageTextStyle(body, ["fontSize", "lineHeight"]),
                color: tokens.color.scene.mutedForeground,
              }}
            >
              <span style={{ ...lineBox, ...reveal.kicker }}>{kicker}</span>
            </p>
          ) : null}
        </header>
      ) : null}
      {children}
    </div>
  );
}
