import { DUR, EASE, STAGGER, enter, ramp } from "../../motion";
import { getEraseMaskStyle } from "../../motion-components/eraseMask";
import { fitTextLines, formatMetric, sceneBounds } from "../layout/layout";
import { positioned, SceneShell } from "../SceneShell";
import { getLineRevealStyle } from "../textReveal";
import {
  BAR_GROW_FRAMES,
  getBarComparisonBeats,
  getBarFractions,
  getEraseStartFrames,
  getRoughEdgeClipPath,
  getRowValueLabel,
} from "./barComparisonMotion";
import type { Rect } from "../layout/layout";
import type {
  BarComparisonPanel,
  BarComparisonSceneProps,
} from "../scenes.types";
import type { ReactNode } from "react";

/** Gap between two panels, as a fraction of the content width. */
const PANEL_GAP = 0.06;
/** Default fractional frames between erased elements inside one panel. */
const ERASE_STAGGER = 0.1;
/** Depth of a rough bar edge, in pixels. */
const ROUGH_EDGE_DEPTH = 10;

/**
 * One or two hero numbers, each over a short ranked bar chart, for an
 * editorial comparison such as two benchmark results side by side. Panels
 * stage hero, labels, growing bars and values in turn, and can leave with a
 * per-element left-to-right erase. Figures are authored data; label them as
 * fictional unless they are sourced.
 */
export function BarComparisonScene(props: BarComparisonSceneProps) {
  const {
    frame,
    width = 1600,
    height = 1000,
    title,
    kicker,
    headingReveal,
    panels,
  } = props;
  if (!panels.length || panels.length > 2) {
    throw new Error("BarComparisonScene needs one or two panels");
  }
  const bounds = sceneBounds(width, height, Boolean(title || kicker));
  const gap = bounds.width * PANEL_GAP;
  const panelWidth = (bounds.width - gap * (panels.length - 1)) / panels.length;
  const eraseStarts = props.exit
    ? getEraseStartFrames({
        atFrame: props.exit.atFrame,
        elementCounts: panels.map(_countPanelElements),
        staggerFrames: props.exit.staggerFrames ?? ERASE_STAGGER,
        panelStaggerFrames: STAGGER,
      })
    : undefined;
  return (
    <SceneShell {...{ frame, width, height, title, kicker, headingReveal }}>
      {panels.map((panel, panelIndex) => {
        return (
          <_Panel
            key={panelIndex}
            {...props}
            panel={panel}
            panelIndex={panelIndex}
            rect={{
              ...bounds,
              x: bounds.x + panelIndex * (panelWidth + gap),
              width: panelWidth,
            }}
            eraseStarts={eraseStarts?.[panelIndex]}
          />
        );
      })}
      {props.footnote ? (
        <p
          style={{
            position: "absolute",
            left: bounds.x,
            bottom: 40,
            margin: 0,
            fontSize: 18,
            color: "var(--muted-foreground)",
            ...enter(frame, props.revealAtFrame ?? 1, { y: 0 }),
          }}
        >
          {props.footnote}
        </p>
      ) : null}
    </SceneShell>
  );
}

function _countPanelElements(panel: BarComparisonPanel): number {
  return 1 + (panel.caption ? 1 : 0) + panel.rows.length * 3;
}

type PanelProps = BarComparisonSceneProps & {
  panel: BarComparisonPanel;
  panelIndex: number;
  rect: Rect;
  eraseStarts?: number[];
};

/** One hero number, its caption and its rows. */
function _Panel(props: PanelProps) {
  const { frame, panel, panelIndex, rect, eraseStarts } = props;
  const beats = getBarComparisonBeats(
    props.revealAtFrame ?? 1,
    panelIndex,
    props.panelStaggerFrames ?? 3,
  );
  const heroText = `${formatMetric(panel.value, panel.precision ?? 0)}${panel.unit ?? ""}`;
  const hero = fitTextLines([heroText], rect.width, rect.height * 0.3, 150, 40);
  const heroHeight = hero.fontSize * 1.05;
  const captionTop = rect.y + heroHeight + 12;
  const rowsTop = captionTop + (panel.caption ? 64 : 24);
  const pitch = Math.min(
    72,
    (rect.y + rect.height - rowsTop) / panel.rows.length,
  );
  // Erase order: hero, caption, then label, bar and value of each row.
  let elementIndex = 0;
  const erasable = (children: ReactNode, key: string) => {
    return (
      <_Erasable
        key={key}
        frame={frame}
        startFrame={eraseStarts?.[elementIndex++]}
        durationInFrames={props.exit?.durationInFrames ?? DUR.press}
      >
        {children}
      </_Erasable>
    );
  };
  return (
    <>
      {erasable(
        <div
          style={{
            ...positioned({ ...rect, height: heroHeight }),
            fontSize: hero.fontSize,
            fontWeight: 600,
            lineHeight: 1,
            letterSpacing: -hero.fontSize * 0.03,
            ...enter(frame, beats.heroAt, {
              dur: DUR.panel,
              easing: EASE.word,
            }),
          }}
        >
          {formatMetric(panel.value, panel.precision ?? 0)}
          {panel.unit ? (
            <span style={{ fontSize: "0.43em", color: "var(--brand)" }}>
              {panel.unit}
            </span>
          ) : null}
        </div>,
        "hero",
      )}
      {panel.caption
        ? erasable(
            <p
              style={{
                ...positioned({ ...rect, y: captionTop, height: 40 }),
                margin: 0,
                fontSize: 24,
                color: "var(--muted-foreground)",
                ...enter(frame, beats.heroAt + STAGGER, { dur: DUR.panel }),
              }}
            >
              {panel.caption}
            </p>,
            "caption",
          )
        : null}
      {panel.rows.map((row, rowIndex) => {
        return _renderRow({
          ...props,
          row,
          rowIndex,
          top: rowsTop + rowIndex * pitch,
          pitch,
          fraction: getBarFractions(panel.rows)[rowIndex],
          beats,
          erasable,
        });
      })}
    </>
  );
}

/** One row's label, bar and value, each erasable on its own. */
function _renderRow({
  frame,
  panel,
  rect,
  row,
  rowIndex,
  top,
  pitch,
  fraction,
  beats,
  barEdge,
  erasable,
}: PanelProps & {
  row: BarComparisonPanel["rows"][number];
  rowIndex: number;
  top: number;
  pitch: number;
  fraction: number;
  beats: ReturnType<typeof getBarComparisonBeats>;
  erasable: (children: ReactNode, key: string) => ReactNode;
}) {
  const fontSize = Math.min(26, pitch * 0.42);
  const barHeight = pitch * 0.58;
  const labelWidth = rect.width * 0.3;
  const barWidth = rect.width * 0.48;
  const center = top + pitch / 2;
  const textStyle = {
    position: "absolute" as const,
    top: center - fontSize * 0.65,
    fontSize,
    lineHeight: 1.3,
    whiteSpace: "nowrap" as const,
  };
  const grow = ramp(
    frame,
    beats.barsAt + rowIndex * STAGGER,
    BAR_GROW_FRAMES,
    EASE.word,
  );
  return [
    erasable(
      <div
        style={{
          ...textStyle,
          left: rect.x,
          width: labelWidth - 16,
          overflow: "hidden",
          textOverflow: "ellipsis",
          color: "var(--muted-foreground)",
          ...getLineRevealStyle(
            frame,
            beats.labelsAt + rowIndex * STAGGER,
            "line-fade",
            { rise: 0 },
          ),
        }}
      >
        {row.label}
      </div>,
      `label-${rowIndex}`,
    ),
    erasable(
      <div
        style={{
          position: "absolute",
          left: rect.x + labelWidth,
          top: center - barHeight / 2,
          width: Math.max(2, fraction * barWidth),
          height: barHeight,
          background: row.highlight ? "var(--brand)" : "var(--muted)",
          clipPath:
            barEdge === "rough"
              ? getRoughEdgeClipPath(rowIndex + 1, ROUGH_EDGE_DEPTH)
              : undefined,
          transformOrigin: "0 50%",
          transform: `scaleX(${grow.toFixed(4)})`,
        }}
      />,
      `bar-${rowIndex}`,
    ),
    erasable(
      <div
        style={{
          ...textStyle,
          left: rect.x + labelWidth + barWidth,
          width: rect.width - labelWidth - barWidth,
          textAlign: "right",
          fontVariantNumeric: "tabular-nums",
          color: "var(--foreground)",
          ...getLineRevealStyle(
            frame,
            beats.valuesAt + rowIndex * STAGGER,
            "line-fade",
            { rise: 0 },
          ),
        }}
      >
        {getRowValueLabel(row, panel.precision ?? 0)}
      </div>,
      `value-${rowIndex}`,
    ),
  ];
}

/** Wraps one element so the scene's exit can erase it on its own. */
function _Erasable({
  frame,
  startFrame,
  durationInFrames,
  children,
}: {
  frame: number;
  startFrame?: number;
  durationInFrames: number;
  children: ReactNode;
}) {
  if (startFrame === undefined) {
    return <>{children}</>;
  }
  const progress = ramp(frame, startFrame, durationInFrames, EASE.inOut);
  return (
    <div
      style={{ position: "absolute", inset: 0, ...getEraseMaskStyle(progress) }}
    >
      {children}
    </div>
  );
}
