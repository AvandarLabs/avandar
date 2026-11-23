import { Img, staticFile } from "remotion";
import { CaptionLayout } from "../../layout/CaptionLayout";
import { TextReveal } from "../../TextReveal/TextReveal";
import css from "./TypographyIcon.module.css";
import type { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import type { useVideoTheme } from "../../../videoTheme/videoThemeHelpers";
import type { TextLayout } from "../../layout/TextLayout";
import type { TypographySceneProps as SceneProps } from "../../scenes.types";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  props: SceneProps;
  motion: ReturnType<typeof useVideoMotion>;
  spacing: ReturnType<typeof useVideoTheme>["mantine"]["spacing"];
  icon: SceneProps["icon"];
  iconSize: number;
  iconAt: number;
  fitted: ReturnType<typeof TextLayout.fitTextLines>;
};
/** Renders typography icon. */
export function TypographyIcon({
  frame,
  props,
  motion,
  spacing,
  icon,
  iconSize,
  iconAt,
  fitted,
}: Readonly<Props>): ReactNode {
  if (!icon) return null;
  return (
    <div
      style={{
        marginBottom: spacing["48"],
        ...TextReveal.getStagedExitStyle({
          frame,
          exit: props.exit,
          orderIndex: fitted.lines.length,
          motion,
        }),
      }}
    >
      <Img
        src={staticFile(CaptionLayout.safePublicPath(icon.src))}
        alt=""
        className={css.typographyIconImg1}
        style={{
          height: iconSize,
          ...TextReveal.getLineRevealStyle({
            frame,
            at: iconAt,
            mode: "line-fade",
            options: { rise: 0 },
            motion,
          }),
        }}
      />
    </div>
  );
}
