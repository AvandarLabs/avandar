import { StageTheme } from "../../../StageTheme/StageTheme";
import { TextReveal } from "../../../TextReveal/TextReveal";
import type { useVideoTheme } from "../../../../videoTheme/videoThemeHelpers";
import type { TextLayout } from "../../../layout/TextLayout";
import type { WindowHeadline } from "../../../scenes.types";
import type { useWindowStage } from "../../useWindowStage";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  height: number;
  theme: ReturnType<typeof useVideoTheme>;
  motion: ReturnType<typeof useWindowStage>["motion"];
  lineStagger: number;
  headline: WindowHeadline;
  fitted: ReturnType<typeof TextLayout.fitTextLines>;
};
/** Renders window headline subtitle. */
export function WindowHeadlineSubtitle({
  frame,
  height,
  theme,
  motion,
  lineStagger,
  headline,
  fitted,
}: Readonly<Props>): ReactNode {
  return (
    <div
      style={{
        marginTop: height * 0.02,
        ...StageTheme.getStageTextStyle({
          role: theme.semantic.text.stage.windowSubtitle,
          fields: ["fontFamily", "color"],
        }),
        fontSize: Math.round(height * 0.024),
        ...TextReveal.getLineRevealStyle({
          frame,
          at: headline.atFrame + fitted.lines.length * lineStagger,
          mode: "line-fade",
          options: {},
          motion,
        }),
      }}
    >
      {headline.subtitle}
    </div>
  );
}
