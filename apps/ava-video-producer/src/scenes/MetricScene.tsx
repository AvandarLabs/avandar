import { DUR, enter, mix, ramp } from "../motion";
import {
  assertFinite,
  assertFrame,
  fitMetricContent,
  formatMetric,
  sceneBounds,
} from "./layout/layout";
import { positioned, SceneShell } from "./SceneShell";
import type { MetricSceneProps } from "./scenes.types";

/** A single headline metric that counts from an initial value up to its target. */
export function MetricScene({
  frame,
  width = 1600,
  height = 1000,
  title,
  kicker,
  label,
  value,
  from = 0,
  unit,
  precision = 0,
  detail,
  countAtFrame = 18,
  countDurationInFrames = 36,
}: MetricSceneProps) {
  assertFinite(from, "metric from");
  assertFrame(countAtFrame, "countAtFrame");
  assertFrame(countDurationInFrames, "countDurationInFrames");
  if (!countDurationInFrames)
    throw new Error("countDurationInFrames must be positive");
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
    mix(ramp(frame, countAtFrame, countDurationInFrames), from, value),
    precision,
  );
  return (
    <SceneShell {...{ frame, width, height, title, kicker }}>
      <section
        aria-label={`${label}: ${formatMetric(value, precision)}${unit ? ` ${unit}` : ""}`}
        style={{
          ...positioned(bounds),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          background: "var(--card)",
          padding: `${layout.paddingY}px ${layout.paddingX}px`,
          ...enter(frame, 6, { y: 12, dur: DUR.sheet }),
        }}
      >
        <div
          style={{
            flexShrink: 0,
            fontSize: layout.label.fontSize,
            lineHeight: 1.22,
            fontWeight: 500,
            textAlign: "center",
            color: "var(--muted-foreground)",
          }}
        >
          {layout.label.lines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
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
            ...enter(frame, 12, { y: 10 }),
          }}
        >
          <span
            style={{
              fontSize: layout.numberSize,
              lineHeight: 1.05,
              fontWeight: 600,
              letterSpacing: -layout.numberSize * 0.035,
              color: "var(--brand-strong)",
            }}
          >
            {display}
          </span>
          {unit ? (
            <span
              style={{
                fontSize: layout.unitSize,
                lineHeight: 1.2,
                color: "var(--muted-foreground)",
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
              lineHeight: 1.3,
              maxWidth: "100%",
              ...enter(frame, countAtFrame + countDurationInFrames, { y: 8 }),
            }}
          >
            {layout.detail.lines.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        ) : null}
      </section>
    </SceneShell>
  );
}
