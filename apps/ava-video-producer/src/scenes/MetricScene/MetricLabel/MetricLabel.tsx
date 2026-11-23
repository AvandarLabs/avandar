import { StageTheme } from "../../StageTheme/StageTheme";
import css from "./MetricLabel.module.css";
import type { useVideoTokens } from "../../../videoTheme/videoThemeHelpers";
import type { TextLayout } from "../../layout/TextLayout";
import type { ReactNode } from "react";

type Props = {
  tokens: ReturnType<typeof useVideoTokens>;
  scene: ReturnType<typeof useVideoTokens>["color"]["scene"];
  layout: ReturnType<typeof TextLayout.fitMetricContent>;
};
/** Renders metric label. */
export function MetricLabel({
  tokens,
  scene,
  layout,
}: Readonly<Props>): ReactNode {
  return (
    <div
      className={css.metricLabeldiv1}
      style={{
        fontSize: layout.label.fontSize,
        ...StageTheme.getStageTextStyle({
          role: tokens.text.stage.caption,
          fields: ["lineHeight", "fontWeight"],
        }),
        textAlign: "center",
        color: scene.mutedForeground,
      }}
    >
      {layout.label.lines.map((line, i) => {
        // prettier-ignore
        // These stateless text nodes are fixed wrapped-line
        // slots within one metric. Duplicate lines are
        // valid.
        // react-doctor-disable-next-line no-array-index-as-key
        return <div key={i}>{line}</div>;
      })}
    </div>
  );
}
