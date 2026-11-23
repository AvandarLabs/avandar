import { TextLayout } from "../../layout/TextLayout";
import { positioned } from "../../positioned";
import { MetricDetail } from "../MetricDetail/MetricDetail";
import { MetricFigure } from "../MetricFigure/MetricFigure";
import { MetricLabel } from "../MetricLabel/MetricLabel";
import type { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import type { useVideoShapeScales } from "../../../videoTheme/useVideoShapeScales";
import type {
  useVideoTheme,
  useVideoTokens,
} from "../../../videoTheme/videoThemeHelpers";
import type { Rect } from "../../layout/SceneGeometry";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  tokens: ReturnType<typeof useVideoTokens>;
  motion: ReturnType<typeof useVideoMotion>;
  scales: ReturnType<typeof useVideoShapeScales>;
  lineHeights: ReturnType<typeof useVideoTheme>["mantine"]["lineHeights"];
  scene: ReturnType<typeof useVideoTokens>["color"]["scene"];
  bounds: Rect;
  label: string;
  value: number;
  precision: number;
  unit: string | undefined;
  layout: ReturnType<typeof TextLayout.fitMetricContent>;
  display: string;
  countAtFrame: number;
  countDurationInFrames: number;
};
/** Renders metric card. */
export function MetricCard({
  label,
  value,
  precision,
  unit,
  ...content
}: Readonly<Props>): ReactNode {
  const { frame, tokens, motion, scales, scene, bounds, layout } = content;
  return (
    <section
      aria-label={`${label}: ${TextLayout.formatMetric({
        value,
        precision,
      })}${unit ? ` ${unit}` : ""}`}
      style={{
        ...positioned(bounds),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        border: `${scales.stroke(tokens.stroke.hairline)}px solid ${scene.border}`,
        borderRadius: scales.corner(tokens.corner.scene),
        background: scene.card,
        padding: `${layout.paddingY}px ${layout.paddingX}px`,
        ...motion.enter(frame, 6, { dur: motion.sheet }),
      }}
    >
      <MetricLabel {...content} />
      <MetricFigure {...content} unit={unit} />
      {layout.detail ? <MetricDetail {...content} /> : null}
    </section>
  );
}
