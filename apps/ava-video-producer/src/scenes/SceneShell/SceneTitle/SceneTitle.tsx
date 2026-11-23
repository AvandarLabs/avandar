import { StageTheme } from "../../StageTheme/StageTheme";
import css from "./SceneTitle.module.css";
import type { useVideoTokens } from "../../../videoTheme/videoThemeHelpers";
import type { SceneBase } from "../../scenes.types";
import type { TextReveal } from "../../TextReveal/TextReveal";
import type { CSSProperties, ReactNode } from "react";

type Props = {
  title: SceneBase["title"];
  heading: ReturnType<typeof useVideoTokens>["text"]["stage"]["sceneHeading"];
  lineBox: CSSProperties;
  reveal: ReturnType<typeof TextReveal.getHeadingRevealStyles>;
  titleSize: number;
};
/** Renders scene title. */
export function SceneTitle({
  title,
  heading,
  lineBox,
  reveal,
  titleSize,
}: Readonly<Props>): ReactNode {
  return (
    <h1
      className={css.sceneTitleh1}
      style={{
        ...StageTheme.getStageTextStyle({
          role: heading,
          fields: ["fontWeight", "lineHeight"],
        }),
        fontSize: titleSize,
        // The role's tracking at the role's own size, so a fitted
        // title keeps the same tracking in pixels at any size.
        letterSpacing: (heading.letterSpacing ?? 0) * heading.fontSize,
      }}
    >
      <span style={{ ...lineBox, ...reveal.title }}>{title}</span>
    </h1>
  );
}
