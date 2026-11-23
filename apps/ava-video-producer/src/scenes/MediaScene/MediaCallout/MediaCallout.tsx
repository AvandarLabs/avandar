import { TextLayout } from "../../layout/TextLayout";
import { MediaCalloutContent } from "./MediaCalloutContent/MediaCalloutContent";
import type { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import type { useVideoShapeScales } from "../../../videoTheme/useVideoShapeScales";
import type {
  useVideoTheme,
  useVideoTokens,
} from "../../../videoTheme/videoThemeHelpers";
import type { Rect } from "../../layout/SceneGeometry";
import type { MediaSceneProps as SceneInput } from "../../scenes.types";
import type { ComponentProps, ReactNode } from "react";

type Props = {
  frame: number;
  tokens: ReturnType<typeof useVideoTokens>;
  motion: ReturnType<typeof useVideoMotion>;
  scales: ReturnType<typeof useVideoShapeScales>;
  spacing: ReturnType<typeof useVideoTheme>["mantine"]["spacing"];
  scene: ReturnType<typeof useVideoTokens>["color"]["scene"];
  caption: ReturnType<typeof useVideoTokens>["text"]["stage"]["caption"];
  bounds: Rect;
  callout: NonNullable<SceneInput["callouts"]>[number];
  captionLineHeight: number;
};
/** Renders one media callout. */
export function MediaCallout({
  frame,
  callout,
  ...context
}: Readonly<Props>): ReactNode {
  if (frame < callout.startFrame || frame >= callout.endFrame) {
    return undefined;
  }
  const content = _getMediaCalloutLayoutFromCue({ frame, callout, ...context });
  return <MediaCalloutContent {...content} />;
}

/** Fits an active media cue and samples its opacity and label placement. */
function _getMediaCalloutLayoutFromCue({
  frame,
  callout,
  bounds,
  motion,
  captionLineHeight,
  ...context
}: Readonly<Props>): ComponentProps<typeof MediaCalloutContent> {
  const duration = Math.min(
    motion.chip,
    (callout.endFrame - callout.startFrame) / 3,
  );
  const fade = motion.reveal.easing;
  const opacity =
    motion.ramp(frame, callout.startFrame, duration, fade) *
    (1 - motion.ramp(frame, callout.endFrame - duration, duration, fade));
  const labelWidth = Math.min(
    bounds.width - 32,
    Math.max(160, Math.min(460, TextLayout.textUnits(callout.label) * 22 + 32)),
  );
  const label = TextLayout.fitTextLines({
    lines: [callout.label],
    width: labelWidth - 32,
    height: 72,
    requested: 22,
    minimum: 18,
  });
  const labelHeight =
    label.lines.length * label.fontSize * captionLineHeight + 20;
  const labelX = Math.max(
    8,
    Math.min(bounds.width - labelWidth - 8, callout.x * bounds.width),
  );
  const targetY = callout.y * bounds.height;
  const labelY =
    targetY >= labelHeight + 12
      ? targetY - labelHeight - 8
      : Math.min(bounds.height - labelHeight - 8, targetY + 8);
  return { ...context, callout, opacity, labelWidth, label, labelX, labelY };
}
