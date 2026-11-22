import css from "./MetricDetail.module.css";
import type { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import type { useVideoTheme } from "../../../videoTheme/videoThemeHelpers";
import type { TextLayout } from "../../layout/TextLayout";
import type { ReactNode } from "react";
/** Detail entry rise in pixels. */
const DETAIL_RISE = 8;
type Props = {
  frame: number;
  motion: ReturnType<typeof useVideoMotion>;
  lineHeights: ReturnType<typeof useVideoTheme>["mantine"]["lineHeights"];
  layout: ReturnType<typeof TextLayout.fitMetricContent>;
  countAtFrame: number;
  countDurationInFrames: number;
};
/** Renders metric detail. */
export function MetricDetail({
  frame,
  motion,
  lineHeights,
  layout,
  countAtFrame,
  countDurationInFrames,
}: Readonly<Props>): ReactNode {
  if (!layout.detail) {return null;}
  return (
    <div
      className={css.metricDetaildiv1}
      style={{
        fontSize: layout.detail.fontSize,
        lineHeight: lineHeights.md,
        ...motion.enter(frame, countAtFrame + countDurationInFrames, {
          y: DETAIL_RISE,
        }),
      }}
    >
      {layout.detail.lines.map((line, i) => {
        // prettier-ignore
        // These stateless text nodes are fixed
        // wrapped-line slots within one metric.
        // Duplicate lines are valid.
        // react-doctor-disable-next-line no-array-index-as-key
        return <div key={i}>{line}</div>;
      })}
    </div>
  );
}
