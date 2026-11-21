import { HEADLINE_BOX } from "../../windowTilt";
import { WindowHeadlineLine } from "../WindowHeadlineLine/WindowHeadlineLine";
import { WindowHeadlineSubtitle } from "../WindowHeadlineSubtitle/WindowHeadlineSubtitle";
import css from "./WindowHeadlineColumn.module.css";
import type { useVideoTheme } from "../../../../videoTheme/videoThemeHelpers";
import type { TextLayout } from "../../../layout/TextLayout";
import type { WindowHeadline } from "../../../scenes.types";
import type { useWindowStage } from "../../useWindowStage";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  width: number;
  height: number;
  theme: ReturnType<typeof useVideoTheme>;
  motion: ReturnType<typeof useWindowStage>["motion"];
  scene: ReturnType<typeof useVideoTheme>["semantic"]["color"]["scene"];
  lineStagger: number;
  headline: WindowHeadline;
  fitted: ReturnType<typeof TextLayout.fitTextLines>;
  columnWidth: number;
  opacity: number;
  exitOpacity: number;
};
/** Renders window headline column. */
export function WindowHeadlineColumn({
  columnWidth,
  opacity,
  exitOpacity,
  width,
  height,
  ...content
}: Readonly<Props>): ReactNode {
  const { headline, fitted } = content;
  return (
    <div
      className={css.windowHeadlineColumndiv1}
      style={{
        left: width * HEADLINE_BOX.x,
        top: height * HEADLINE_BOX.y,
        width: columnWidth,
        opacity: opacity * exitOpacity,
      }}
    >
      {fitted.lines.map((line, row) => {
        return (
          <WindowHeadlineLine
            key={`${headline.atFrame}-${row}`}
            {...content}
            {...{ line, row }}
          />
        );
      })}
      {headline.subtitle ? (
        <WindowHeadlineSubtitle height={height} {...content} />
      ) : null}
    </div>
  );
}
