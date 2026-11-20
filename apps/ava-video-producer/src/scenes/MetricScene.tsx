import { mix } from "../motion";
import { useVideoMotion } from "../videoTheme/useVideoMotion";
import { useVideoShapeScales } from "../videoTheme/useVideoShapeScales";
import { useVideoTheme, useVideoTokens } from "../videoTheme/useVideoTheme";
import {
  assertFinite,
  assertFrame,
  fitMetricContent,
  formatMetric,
  sceneBounds,
} from "./layout/layout";
import { positioned } from "./positioned";
import { SceneShell } from "./SceneShell";
import { StageTheme } from "./StageTheme/StageTheme";
import type { MetricSceneProps as Props } from "./scenes.types";
import type { ReactNode } from "react";
/** How far the figure row rises as it arrives, in pixels. */
const FIGURE_RISE = 10;
/** How far the detail rises as it arrives, in pixels. */
const DETAIL_RISE = 8;
/**
 * A single headline metric that counts from an initial value up to its target.
 * The figure is `text.stage.figure` in the strong brand colour, the label
 * the `text.stage.caption` weight, on a scene palette card.
 */
export function MetricScene({
  frame,
  width = 1600,
  height = 1000,
  title,
  kicker,
  headingReveal,
  label,
  value,
  from = 0,
  unit,
  precision = 0,
  detail,
  countAtFrame = 18,
  countDurationInFrames = 36,
}: Props): ReactNode {
  assertFinite(from, "metric from");
  assertFrame(countAtFrame, "countAtFrame");
  assertFrame(countDurationInFrames, "countDurationInFrames");
  if (!countDurationInFrames)
    throw new Error("countDurationInFrames must be positive");
  const tokens = useVideoTokens();
  const motion = useVideoMotion();
  const scales = useVideoShapeScales();
  const lineHeights = useVideoTheme().mantine.lineHeights;
  const scene = tokens.color.scene;
  const bounds = sceneBounds(width, height, Boolean(title || kicker));
  const layout = fitMetricContent({
    width: bounds.width,
    height: bounds.height,
    label,
    value,
    from,
    unit,
    precision,
    detail,
  });
  const display = formatMetric(
    mix(
      motion.ramp(
        frame,
        countAtFrame,
        countDurationInFrames,
        motion.reveal.easing,
      ),
      from,
      value,
    ),
    precision,
  );
  return (
    <SceneShell {...{ frame, width, height, title, kicker, headingReveal }}>
      <section
        aria-label={`${label}: ${formatMetric(value, precision)}${unit ? ` ${unit}` : ""}`}
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
        <div
          style={{
            flexShrink: 0,
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
        <div
          style={{
            display: "flex",
            flexShrink: 0,
            height: layout.numberHeight,
            alignItems: "baseline",
            justifyContent: "center",
            gap: layout.unitGap,
            margin: `${layout.numberGap}px 0`,
            whiteSpace: "nowrap",
            fontVariantNumeric: "tabular-nums",
            ...motion.enter(frame, 12, { y: FIGURE_RISE }),
          }}
        >
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
        {layout.detail ? (
          <div
            style={{
              flexShrink: 0,
              fontSize: layout.detail.fontSize,
              textAlign: "center",
              lineHeight: lineHeights.md,
              maxWidth: "100%",
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
        ) : null}
      </section>
    </SceneShell>
  );
}
