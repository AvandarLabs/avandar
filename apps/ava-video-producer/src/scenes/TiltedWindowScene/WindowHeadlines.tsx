import { useVideoTheme } from "../../videoTheme/useVideoTheme";
import { fitTextLines } from "../layout/layout";
import { StageTheme } from "../StageTheme/StageTheme";
import { getLineRevealStyle } from "../textReveal/textReveal";
import { useWindowStage } from "./useWindowStage";
import { WindowMotion } from "./WindowMotion/WindowMotion";
import { HEADLINE_BOX } from "./windowTilt";
import type { WindowHeadline } from "../scenes.types";
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
  const columnWidth = width * HEADLINE_BOX.width;
  const fitted = fitTextLines(
    headline.lines,
    columnWidth,
    height * 0.3,
    Math.round(height * 0.066),
    32,
  );
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
  return (
    <div
      style={{
        position: "absolute",
        left: width * HEADLINE_BOX.x,
        top: height * HEADLINE_BOX.y,
        width: columnWidth,
        opacity: opacity * exitOpacity,
      }}
    >
      {fitted.lines.map((line, row) => {
        return (
          <div
            key={`${headline.atFrame}-${row}`}
            style={{
              ...StageTheme.getStageTextStyle({
                role: theme.semantic.text.stage.windowHeadline,
                fields: ["lineHeight", "fontWeight", "letterSpacing"],
              }),
              fontSize: fitted.fontSize,
              color: scene.foreground,
              ...getLineRevealStyle({
                frame,
                at: headline.atFrame + row * lineStagger,
                mode: "line-fade",
                options: {},
                motion,
              }),
            }}
          >
            {line}
          </div>
        );
      })}
      {headline.subtitle ? (
        <div
          style={{
            marginTop: height * 0.02,
            ...StageTheme.getStageTextStyle({
              role: theme.semantic.text.stage.windowSubtitle,
              fields: ["fontFamily", "color"],
            }),
            fontSize: Math.round(height * 0.024),
            ...getLineRevealStyle({
              frame,
              at: headline.atFrame + fitted.lines.length * lineStagger,
              mode: "line-fade",
              options: {},
              motion,
            }),
          }}
        >
          {headline.subtitle}
        </div>
      ) : null}
    </div>
  );
}
