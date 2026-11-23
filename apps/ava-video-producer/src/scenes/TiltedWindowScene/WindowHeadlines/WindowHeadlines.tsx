import { useVideoTheme } from "../../../videoTheme/videoThemeHelpers";
import { TextLayout } from "../../layout/TextLayout";
import { useWindowStage } from "../useWindowStage";
import { WindowMotion } from "../WindowMotion/WindowMotion";
import { HEADLINE_BOX } from "../windowTilt";
import { WindowHeadlineColumn } from "./WindowHeadlineColumn/WindowHeadlineColumn";
import type { WindowHeadline } from "../../scenes.types";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  headlines: WindowHeadline[];
  width: number;
  height: number;
  /** The frame the window starts whipping out; the headline fades in place. */
  exitAtFrame?: number;
};
/**
 * The headline column beside a tilted window: lines fade in a rise stagger
 * apart, a later headline replaces the earlier one, and on exit the copy
 * fades where it stands while the window leaves. Lines are
 * `text.stage.windowHeadline` at their fitted size; the subtitle is
 * `text.stage.windowSubtitle` at its fitted size.
 */
export function WindowHeadlines({
  frame,
  headlines,
  width,
  height,
  exitAtFrame,
}: Props): ReactNode {
  const theme = useVideoTheme();
  const stage = useWindowStage();
  const { motion } = stage;
  const scene = theme.semantic.color.scene;
  const lineStagger = motion.rise.stagger;
  const { index, opacity } = WindowMotion.getActiveHeadline({
    frame,
    headlines,
    stage,
  });
  const headline = headlines[index];
  const { columnWidth, fitted, exitOpacity } = _getHeadlineLayoutFromStage({
    frame,
    width,
    height,
    headline,
    exitAtFrame,
    stage,
  });
  return (
    <WindowHeadlineColumn
      {...{
        frame,
        width,
        height,
        theme,
        motion,
        scene,
        lineStagger,
        headline,
        fitted,
        columnWidth,
        opacity,
        exitOpacity,
      }}
    />
  );
}

type HeadlineLayoutOptions = {
  frame: number;
  width: number;
  height: number;
  headline: WindowHeadline;
  exitAtFrame: number | undefined;
  stage: ReturnType<typeof useWindowStage>;
};
/** Fits headline copy and samples its independently staged exit. */
function _getHeadlineLayoutFromStage({
  frame,
  width,
  height,
  headline,
  exitAtFrame,
  stage,
}: Readonly<HeadlineLayoutOptions>): {
  columnWidth: number;
  fitted: ReturnType<typeof TextLayout.fitTextLines>;
  exitOpacity: number;
} {
  const { motion } = stage;
  const columnWidth = width * HEADLINE_BOX.width;
  const fitted = TextLayout.fitTextLines({
    lines: headline.lines,
    width: columnWidth,
    height: height * 0.3,
    requested: Math.round(height * 0.066),
    minimum: 32,
  });
  const exitOpacity =
    exitAtFrame === undefined
      ? 1
      : 1 -
        motion.ramp(
          frame,
          exitAtFrame + 1,
          motion.chip,
          motion.dissolve.easing,
        );
  return { columnWidth, fitted, exitOpacity };
}
