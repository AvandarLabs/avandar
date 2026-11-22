import { StageTheme } from "../../StageTheme/StageTheme";
import css from "./MediaHeading.module.css";
import type { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import type { useVideoTokens } from "../../../videoTheme/videoThemeHelpers";
import type { TextLayout } from "../../layout/TextLayout";
import type { ReactNode } from "react";

/** Heading entry rise in pixels. */
const HEADING_RISE = 6;
type Props = {
  frame: number;
  motion: ReturnType<typeof useVideoMotion>;
  cardTitle: ReturnType<typeof useVideoTokens>["text"]["stage"]["cardTitle"];
  heading: ReturnType<typeof TextLayout.fitTextLines> | undefined;
};
/** Renders media heading. */
export function MediaHeading({
  frame,
  motion,
  cardTitle,
  heading,
}: Readonly<Props>): ReactNode {
  if (!heading) {return null;}
  return (
    <h1
      className={css.mediaHeadingh1}
      style={{
        fontSize: heading.fontSize,
        ...StageTheme.getStageTextStyle({
          role: cardTitle,
          fields: ["lineHeight", "fontWeight"],
        }),
        ...motion.enter(frame, 0, {
          y: HEADING_RISE,
          dur: motion.sheet,
        }),
      }}
    >
      {heading.lines.map((line, i) => {
        // prettier-ignore
        // These stateless text nodes are fixed
        // wrapped-line slots within one keyed scene
        // or callout. Duplicate lines are valid.
        // react-doctor-disable-next-line no-array-index-as-key
        return <div key={i}>{line}</div>;
      })}
    </h1>
  );
}
