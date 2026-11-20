import { getEraseMaskStyle } from "../../motion-components/eraseMask";
import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import { useVideoTheme, useVideoTokens } from "../../videoTheme/useVideoTheme";
import { fitTextLines, formatMetric, sceneBounds } from "../layout/layout";
import { positioned } from "../positioned";
import { SceneShell } from "../SceneShell";
import { StageTheme } from "../StageTheme/StageTheme";
import { getLineRevealStyle } from "../textReveal/textReveal";
import {
  getBarComparisonBeats,
  getBarFractions,
  getEraseStartFrames,
  getRoughEdgeClipPath,
  getRowValueLabel,
} from "./barComparisonMotion/barComparisonMotion";
import type { VideoMotion } from "../../videoTheme/createVideoMotion/createVideoMotion";
import type { ResolvedVideoTheme } from "../../videoTheme/videoTheme.types";
import type { Rect } from "../layout/layout";
import type {
  BarComparisonPanel,
  BarComparisonSceneProps,
} from "../scenes.types";
import type { ReactNode } from "react";

type ErasableOptions = {
  frame: number;
  startFrame?: number;
  durationInFrames: number;
  motion: VideoMotion;
  children: ReactNode;
};
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
 * fictional unless they are sourced. Type comes from the stage roles
 * (`heroFigure`, `barLabel`, `sceneBody`) and colour from the scene palette.
 */
export function BarComparisonScene(props: BarComparisonSceneProps): ReactNode {
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
  const theme = useVideoTheme();
  const tokens = useVideoTokens();
  const motion = useVideoMotion();
  const bounds = sceneBounds(width, height, Boolean(title || kicker));
  const gap = bounds.width * PANEL_GAP;
  const panelWidth = (bounds.width - gap * (panels.length - 1)) / panels.length;
  const eraseStarts = props.exit
    ? getEraseStartFrames({
        atFrame: props.exit.atFrame,
        elementCounts: panels.map(_countPanelElements),
        staggerFrames: props.exit.staggerFrames ?? ERASE_STAGGER,
        panelStaggerFrames: motion.stagger.list,
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
            theme={theme}
            motion={motion}
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
            fontSize: theme.mantine.fontSizes.xl,
            color: tokens.color.scene.mutedForeground,
            ...motion.enter(frame, props.revealAtFrame ?? 1, { y: 0 }),
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
  theme: ResolvedVideoTheme;
  motion: VideoMotion;
};
/** One hero number, its caption and its rows. */
function _Panel(props: PanelProps) {
  const { frame, panel, panelIndex, rect, eraseStarts, theme, motion } = props;
  const scene = theme.semantic.color.scene;
  const beats = getBarComparisonBeats({
    revealAtFrame: props.revealAtFrame ?? 1,
    panelIndex,
    panelStaggerFrames: props.panelStaggerFrames ?? motion.rise.stagger,
    motion,
  });
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
        durationInFrames={props.exit?.durationInFrames ?? motion.press.duration}
        motion={motion}
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
            ...StageTheme.getStageTextStyle({
              role: theme.semantic.text.stage.heroFigure,
              fields: ["fontWeight", "lineHeight", "letterSpacing"],
            }),
            ...motion.enter(frame, beats.heroAt, {
              dur: motion.panel,
              easing: motion.rise.easing,
            }),
          }}
        >
          {formatMetric(panel.value, panel.precision ?? 0)}
          {panel.unit ? (
            <span style={{ fontSize: "0.43em", color: scene.brand }}>
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
                fontSize: theme.semantic.text.stage.sceneBody.fontSize,
                color: scene.mutedForeground,
                ...motion.enter(frame, beats.heroAt + motion.stagger.list, {
                  dur: motion.panel,
                }),
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

type RenderRowOptions = PanelProps & {
  row: BarComparisonPanel["rows"][number];
  rowIndex: number;
  top: number;
  pitch: number;
  fraction: number;
  beats: ReturnType<typeof getBarComparisonBeats>;
  erasable: (children: ReactNode, key: string) => ReactNode;
};
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
  theme,
  motion,
}: RenderRowOptions) {
  const fontSize = Math.min(26, pitch * 0.42);
  const barHeight = pitch * 0.58;
  const labelWidth = rect.width * 0.3;
  const barWidth = rect.width * 0.48;
  const center = top + pitch / 2;
  const scene = theme.semantic.color.scene;
  const textStyle = {
    position: "absolute" as const,
    top: center - fontSize * 0.65,
    fontSize,
    ...StageTheme.getStageTextStyle({
      role: theme.semantic.text.stage.barLabel,
      fields: ["lineHeight"],
    }),
    whiteSpace: "nowrap" as const,
  };
  const rowAt = rowIndex * motion.stagger.list;
  const grow = motion.ramp(
    frame,
    beats.barsAt + rowAt,
    motion.sheet,
    motion.rise.easing,
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
          color: scene.mutedForeground,
          ...getLineRevealStyle({
            frame,
            at: beats.labelsAt + rowAt,
            mode: "line-fade",
            options: { rise: 0 },
            motion,
          }),
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
          background: row.highlight ? scene.brand : scene.muted,
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
          color: scene.foreground,
          ...getLineRevealStyle({
            frame,
            at: beats.valuesAt + rowAt,
            mode: "line-fade",
            options: { rise: 0 },
            motion,
          }),
        }}
      >
        {getRowValueLabel(row, panel.precision ?? 0)}
      </div>,
      `value-${rowIndex}`,
    ),
  ];
}
/**
 * Wraps one element so the scene's exit can erase it on its own, sweeping on
 * the travel curve.
 */
function _Erasable({
  frame,
  startFrame,
  durationInFrames,
  motion,
  children,
}: ErasableOptions) {
  if (startFrame === undefined) {
    return <>{children}</>;
  }
  const progress = motion.ramp(
    frame,
    startFrame,
    durationInFrames,
    motion.travel.easing,
  );
  return (
    <div
      style={{ position: "absolute", inset: 0, ...getEraseMaskStyle(progress) }}
    >
      {children}
    </div>
  );
}
