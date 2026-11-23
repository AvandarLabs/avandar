import { StageTheme } from "../../../StageTheme/StageTheme";
import { TextReveal } from "../../../TextReveal/TextReveal";
import type { useVideoTheme } from "../../../../videoTheme/videoThemeHelpers";
import type { TextLayout } from "../../../layout/TextLayout";
import type { WindowHeadline } from "../../../scenes.types";
import type { useWindowStage } from "../../useWindowStage";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  theme: ReturnType<typeof useVideoTheme>;
  motion: ReturnType<typeof useWindowStage>["motion"];
  scene: ReturnType<typeof useVideoTheme>["semantic"]["color"]["scene"];
  lineStagger: number;
  headline: WindowHeadline;
  fitted: ReturnType<typeof TextLayout.fitTextLines>;
  line: string;
  row: number;
};
/** Renders window headline line. */
export function WindowHeadlineLine({
  frame,
  theme,
  motion,
  scene,
  lineStagger,
  headline,
  fitted,
  line,
  row,
}: Readonly<Props>): ReactNode {
  return (
    <div
      key={`${headline.atFrame}-${row}`}
      style={{
        ...StageTheme.getStageTextStyle({
          role: theme.semantic.text.stage.windowHeadline,
          fields: ["lineHeight", "fontWeight", "letterSpacing"],
        }),
        fontSize: fitted.fontSize,
        color: scene.foreground,
        ...TextReveal.getLineRevealStyle({
          frame,
          at: headline.atFrame + row * lineStagger,
          mode: "line-fade",
          options: {},
          motion,
        }),
      }}
    >
      {line}
    </div>
  );
}
