import { MediaHeading } from "../MediaHeading/MediaHeading";
import { MediaSubtitle } from "../MediaSubtitle/MediaSubtitle";
import css from "./MediaHeader.module.css";
import type { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import type {
  useVideoTheme,
  useVideoTokens,
} from "../../../videoTheme/videoThemeHelpers";
import type { TextLayout } from "../../layout/TextLayout";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  motion: ReturnType<typeof useVideoMotion>;
  spacing: ReturnType<typeof useVideoTheme>["mantine"]["spacing"];
  scene: ReturnType<typeof useVideoTokens>["color"]["scene"];
  cardTitle: ReturnType<typeof useVideoTokens>["text"]["stage"]["cardTitle"];
  heading: ReturnType<typeof TextLayout.fitTextLines> | undefined;
  subtitle: ReturnType<typeof TextLayout.fitTextLines> | undefined;
};
/** Renders media header. */
export function MediaHeader({
  frame,
  motion,
  spacing,
  scene,
  cardTitle,
  heading,
  subtitle,
}: Readonly<Props>): ReactNode {
  return (
    <header
      className={css.mediaHeaderheader1}
      style={{
        gap: spacing["24"],
      }}
    >
      {heading ? (
        <MediaHeading {...{ frame, motion, cardTitle, heading }} />
      ) : null}
      {subtitle ? (
        <MediaSubtitle {...{ frame, motion, scene, cardTitle, subtitle }} />
      ) : null}
    </header>
  );
}
