import css from "./MediaSubtitle.module.css";
import type { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import type { useVideoTokens } from "../../../videoTheme/videoThemeHelpers";
import type { TextLayout } from "../../layout/TextLayout";
import type { ReactNode } from "react";

/** Subtitle entry rise in pixels. */
const SUBTITLE_RISE = 4;
type Props = {
  frame: number;
  motion: ReturnType<typeof useVideoMotion>;
  scene: ReturnType<typeof useVideoTokens>["color"]["scene"];
  cardTitle: ReturnType<typeof useVideoTokens>["text"]["stage"]["cardTitle"];
  subtitle: ReturnType<typeof TextLayout.fitTextLines> | undefined;
};
/** Renders media subtitle. */
export function MediaSubtitle({
  frame,
  motion,
  scene,
  cardTitle,
  subtitle,
}: Readonly<Props>): ReactNode {
  if (!subtitle) {return null;}
  return (
    <p
      className={css.mediaSubtitlep1}
      style={{
        fontSize: subtitle.fontSize,
        lineHeight: cardTitle.lineHeight,
        color: scene.mutedForeground,
        ...motion.enter(frame, motion.panel, { y: SUBTITLE_RISE }),
      }}
    >
      {subtitle.lines.map((line, i) => {
        return (
          // prettier-ignore
          // These stateless text nodes are fixed
          // wrapped-line slots within one keyed
          // scene or callout. Duplicate lines are
          // valid.
          // react-doctor-disable-next-line no-array-index-as-key
          <span key={i} className={css.mediaSubtitlespan2}>
                    {line}
                  </span>
        );
      })}
    </p>
  );
}
