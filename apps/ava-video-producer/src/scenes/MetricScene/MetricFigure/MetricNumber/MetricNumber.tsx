import { StageTheme } from "../../../StageTheme/StageTheme";
import type { useVideoTokens } from "../../../../videoTheme/videoThemeHelpers";
import type { TextLayout } from "../../../layout/TextLayout";
import type { ReactNode } from "react";

type Props = {
  tokens: ReturnType<typeof useVideoTokens>;
  scene: ReturnType<typeof useVideoTokens>["color"]["scene"];
  layout: ReturnType<typeof TextLayout.fitMetricContent>;
  display: string;
};
/** Renders metric number. */
export function MetricNumber({
  tokens,
  scene,
  layout,
  display,
}: Readonly<Props>): ReactNode {
  return (
    <span
      style={{
        fontSize: layout.numberSize,
        ...StageTheme.getStageTextStyle({
          role: tokens.text.stage.figure,
          fields: ["lineHeight", "fontWeight", "letterSpacing"],
        }),
        color: scene.brandStrong,
      }}
    >
      {display}
    </span>
  );
}
