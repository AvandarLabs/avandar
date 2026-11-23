import css from "./MetricFigure.module.css";
import { MetricNumber } from "./MetricNumber/MetricNumber";
import type { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import type {
  useVideoTheme,
  useVideoTokens,
} from "../../../videoTheme/videoThemeHelpers";
import type { TextLayout } from "../../layout/TextLayout";
import type { ReactNode } from "react";
/** Figure entry rise in pixels. */
const FIGURE_RISE = 10;
type Props = {
  frame: number;
  tokens: ReturnType<typeof useVideoTokens>;
  motion: ReturnType<typeof useVideoMotion>;
  lineHeights: ReturnType<typeof useVideoTheme>["mantine"]["lineHeights"];
  scene: ReturnType<typeof useVideoTokens>["color"]["scene"];
  unit: string | undefined;
  layout: ReturnType<typeof TextLayout.fitMetricContent>;
  display: string;
};
/** Renders metric figure. */
export function MetricFigure({
  frame,
  tokens,
  motion,
  lineHeights,
  scene,
  unit,
  layout,
  display,
}: Readonly<Props>): ReactNode {
  return (
    <div
      className={css.metricFigurediv1}
      style={{
        height: layout.numberHeight,
        gap: layout.unitGap,
        margin: `${layout.numberGap}px 0`,
        ...motion.enter(frame, 12, { y: FIGURE_RISE }),
      }}
    >
      <MetricNumber {...{ tokens, scene, layout, display }} />
      {unit ? (
        <span
          style={{
            fontSize: layout.unitSize,
            lineHeight: lineHeights["120"],
            color: scene.mutedForeground,
          }}
        >
          {unit}
        </span>
      ) : null}
    </div>
  );
}
