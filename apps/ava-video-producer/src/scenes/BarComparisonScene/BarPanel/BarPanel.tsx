import { TextLayout } from "../../layout/TextLayout";
import { BarComparisonMotion } from "../BarComparisonMotion/BarComparisonMotion";
import { BarErasable } from "../BarErasable/BarErasable";
import { renderBarRow } from "../renderBarRow/renderBarRow";
import { BarCaption } from "./BarCaption/BarCaption";
import { BarHero } from "./BarHero/BarHero";
import type { PanelProps as Props } from "../BarComparisonScene.types";
import type { ReactNode } from "react";

/** One hero number, its caption and its rows. */
export function BarPanel({ panel, ...props }: Readonly<Props>): ReactNode {
  const { frame, eraseStarts, motion } = props;
  const layout = _getPanelLayoutFromPanel({ panel, ...props });
  const { beats, rowsTop, pitch } = layout;
  const content = { panel, ...props, ...layout };
  // Erase order: hero, caption, then label, bar and value of each row.
  let elementIndex = 0;
  const erasable = (children: ReactNode, key: string) => {
    return (
      <BarErasable
        key={key}
        frame={frame}
        startFrame={eraseStarts?.[elementIndex++]}
        durationInFrames={props.exit?.durationInFrames ?? motion.press.duration}
        motion={motion}
      >
        {children}
      </BarErasable>
    );
  };
  return (
    <>
      {erasable(<BarHero {...content} />, "hero")}
      {panel.caption ? erasable(<BarCaption {...content} />, "caption") : null}
      {panel.rows.map((row, rowIndex) => {
        return renderBarRow({
          ...props,
          panel,
          row,
          rowIndex,
          top: rowsTop + rowIndex * pitch,
          pitch,
          fraction: BarComparisonMotion.getBarFractions(panel.rows)[rowIndex],
          beats,
          erasable,
        });
      })}
    </>
  );
}

/** Fits the hero and reserves the caption and ranked row slots. */
function _getPanelLayoutFromPanel({
  panel,
  panelIndex,
  rect,
  theme,
  motion,
  ...options
}: Readonly<Props>): {
  scene: Props["theme"]["semantic"]["color"]["scene"];
  beats: ReturnType<typeof BarComparisonMotion.getBarComparisonBeats>;
  hero: ReturnType<typeof TextLayout.fitTextLines>;
  heroHeight: number;
  captionTop: number;
  rowsTop: number;
  pitch: number;
} {
  const scene = theme.semantic.color.scene;
  const beats = BarComparisonMotion.getBarComparisonBeats({
    revealAtFrame: options.revealAtFrame ?? 1,
    panelIndex,
    panelStaggerFrames: options.panelStaggerFrames ?? motion.rise.stagger,
    motion,
  });
  const heroText = `${TextLayout.formatMetric({
    value: panel.value,
    precision: panel.precision ?? 0,
  })}${panel.unit ?? ""}`;
  const hero = TextLayout.fitTextLines({
    lines: [heroText],
    width: rect.width,
    height: rect.height * 0.3,
    requested: 150,
    minimum: 40,
  });
  const heroHeight = hero.fontSize * 1.05;
  const captionTop = rect.y + heroHeight + 12;
  const rowsTop = captionTop + (panel.caption ? 64 : 24);
  const pitch = Math.min(
    72,
    (rect.y + rect.height - rowsTop) / panel.rows.length,
  );
  return { scene, beats, hero, heroHeight, captionTop, rowsTop, pitch };
}
