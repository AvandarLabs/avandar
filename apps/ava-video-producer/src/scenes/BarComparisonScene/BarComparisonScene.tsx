import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import {
  useVideoTheme,
  useVideoTokens,
} from "../../videoTheme/videoThemeHelpers";
import { SceneGeometry } from "../layout/SceneGeometry";
import { SceneShell } from "../SceneShell/SceneShell";
import { BarComparisonMotion } from "./BarComparisonMotion/BarComparisonMotion";
import { BarFootnote } from "./BarFootnote/BarFootnote";
import { BarPanelList } from "./BarPanelList/BarPanelList";
import type { VideoMotion } from "../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Rect } from "../layout/SceneGeometry";
import type {
  BarComparisonPanel,
  BarComparisonSceneProps,
} from "../scenes.types";
import type { ReactNode } from "react";

type Props = BarComparisonSceneProps;

/** Gap between two panels, as a fraction of the content width. */
const PANEL_GAP = 0.06;
/** Default fractional frames between erased elements inside one panel. */
const ERASE_STAGGER = 0.1;
/**
 * One or two hero numbers, each over a short ranked bar chart, for an
 * editorial comparison such as two benchmark results side by side. Panels
 * stage hero, labels, growing bars and values in turn, and can leave with a
 * per-element left-to-right erase. Figures are authored data; label them as
 * fictional unless they are sourced. Type comes from the stage roles
 * (`heroFigure`, `barLabel`, `sceneBody`) and colour from the scene palette.
 */

export function BarComparisonScene({
  panels,
  ...props
}: Readonly<Props>): ReactNode {
  const {
    frame,
    width = 1600,
    height = 1000,
    title,
    kicker,
    headingReveal,
  } = props;
  if (!panels.length || panels.length > 2) {
    throw new Error("BarComparisonScene needs one or two panels");
  }
  const theme = useVideoTheme();
  const tokens = useVideoTokens();
  const motion = useVideoMotion();
  const layout = _getBarPanelLayoutFromScene({
    panels,
    props,
    width,
    height,
    title,
    kicker,
    motion,
  });
  const { bounds } = layout;
  const content = { panels, props, ...layout, theme, motion };
  return (
    <SceneShell {...{ frame, width, height, title, kicker, headingReveal }}>
      <BarPanelList {...content} />
      {props.footnote ? (
        <BarFootnote {...{ frame, bounds, theme, tokens, motion, props }} />
      ) : null}
    </SceneShell>
  );
}
function _countPanelElements(panel: BarComparisonPanel): number {
  return 1 + (panel.caption ? 1 : 0) + panel.rows.length * 3;
}

type PanelLayoutOptions = {
  panels: Props["panels"];
  props: Omit<Props, "panels">;
  width: number;
  height: number;
  title: Props["title"];
  kicker: Props["kicker"];
  motion: VideoMotion;
};
/** Measures the panel columns and keeps erase scheduling independent. */
function _getBarPanelLayoutFromScene({
  panels,
  props,
  width,
  height,
  title,
  kicker,
  motion,
}: Readonly<PanelLayoutOptions>): {
  bounds: Rect;
  gap: number;
  panelWidth: number;
  eraseStarts: number[][] | undefined;
} {
  const bounds = SceneGeometry.sceneBounds({
    width,
    height,
    hasHeading: Boolean(title || kicker),
  });
  const gap = bounds.width * PANEL_GAP;
  const panelWidth = (bounds.width - gap * (panels.length - 1)) / panels.length;
  const eraseStarts = props.exit
    ? BarComparisonMotion.getEraseStartFrames({
        atFrame: props.exit.atFrame,
        elementCounts: panels.map(_countPanelElements),
        staggerFrames: props.exit.staggerFrames ?? ERASE_STAGGER,
        panelStaggerFrames: motion.stagger.list,
      })
    : undefined;
  return { bounds, gap, panelWidth, eraseStarts };
}
