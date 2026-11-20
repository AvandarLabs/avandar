import { useVideoMotion } from "../videoTheme/useVideoMotion";
import { useVideoShapeScales } from "../videoTheme/useVideoShapeScales";
import { useVideoTokens } from "../videoTheme/useVideoTheme";
import {
  activeCaption,
  captionGeometry,
  validateCaptions,
} from "./layout/layout";
import { StageTheme } from "./StageTheme/StageTheme";
import type { VideoMotion } from "../videoTheme/createVideoMotion/createVideoMotion";
import type { CaptionOverlayProps as Props } from "./scenes.types";
import type { CSSProperties, ReactNode } from "react";
/**
 * The caption box, hung from the bottom centre of the canvas and sized by
 * its fitted geometry, through its line height.
 */
function _buildCaptionBoxStyle({
  geometry,
  tokens,
  toCorner,
}: Readonly<{
  geometry: ReturnType<typeof captionGeometry>;
  tokens: ReturnType<typeof useVideoTokens>;
  toCorner: (radius: number) => number;
}>): CSSProperties {
  return {
    position: "absolute",
    left: "50%",
    bottom: geometry.bottom,
    transform: "translateX(-50%)",
    width: "max-content",
    maxWidth: geometry.maxWidth,
    height: geometry.boxHeight,
    boxSizing: "border-box",
    padding: `${geometry.paddingY}px ${geometry.paddingX}px`,
    border: `${geometry.borderWidth}px solid ${tokens.color.scene.border}`,
    borderRadius: toCorner(tokens.corner.scene),
    background: tokens.color.scene.ground,
    ...StageTheme.getStageTextStyle({
      role: tokens.text.stage.caption,
      fields: ["fontFamily", "fontWeight", "color"],
    }),
    fontSize: geometry.fontSize,
    lineHeight: geometry.lineHeight,
  };
}
/** A cue's fade in, never longer than a third of the cue. */
function _getCueFadeIn({
  frame,
  cue,
  motion,
}: Readonly<{
  frame: number;
  cue: Readonly<{ startFrame: number; endFrame: number }>;
  motion: VideoMotion;
}>): number {
  const fadeDuration = Math.min(
    motion.chip,
    (cue.endFrame - cue.startFrame) / 3,
  );
  return motion.ramp(
    frame,
    cue.startFrame,
    fadeDuration,
    motion.entrance.easing,
  );
}
/**
 * Whole-cue captions. Alignment comes from authored or imported cue times.
 * Type is `text.stage.caption`, its size the default the fit starts from,
 * on a box in the scene palette with the scene corner.
 */
export function CaptionOverlay({
  frame,
  cues,
  width = 1600,
  height = 1000,
  bottom = 48,
  fontSize,
}: Props): ReactNode {
  const tokens = useVideoTokens();
  const motion = useVideoMotion();
  const scales = useVideoShapeScales();
  const caption = tokens.text.stage.caption;
  validateCaptions(cues);
  const cue = activeCaption(frame, cues);
  if (!cue) return null;
  const geometry = captionGeometry({
    text: cue.text,
    width,
    height,
    fontSize: fontSize ?? caption.fontSize,
    bottom,
    borderWidth: scales.stroke(tokens.stroke.hairline),
  });
  return (
    <div
      aria-label={cue.text}
      style={{
        ..._buildCaptionBoxStyle({ geometry, tokens, toCorner: scales.corner }),
        textAlign: "center",
        opacity: _getCueFadeIn({ frame, cue, motion }),
        pointerEvents: "none",
      }}
    >
      {geometry.lines.map((line, index) => {
        // prettier-ignore
        // These stateless text nodes are fixed wrapped-line slots.
        // Duplicate lines are valid and carry no independent item
        // state.
        // react-doctor-disable-next-line no-array-index-as-key
        return <div key={index}>{line}</div>;
      })}
    </div>
  );
}
