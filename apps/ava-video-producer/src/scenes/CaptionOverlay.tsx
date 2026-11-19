import { useVideoMotion } from "../videoTheme/useVideoMotion";
import { useVideoShapeScales } from "../videoTheme/useVideoShapeScales";
import { useVideoTokens } from "../videoTheme/useVideoTheme";
import {
  activeCaption,
  captionGeometry,
  validateCaptions,
} from "./layout/layout";
import { getStageTextStyle } from "./stageTheme/stageTheme";
import type { CaptionOverlayProps } from "./scenes.types";
import type { ReactNode } from "react";

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
}: CaptionOverlayProps): ReactNode {
  const tokens = useVideoTokens();
  const motion = useVideoMotion();
  const scales = useVideoShapeScales();
  const caption = tokens.text.stage.caption;
  validateCaptions(cues);
  const cue = activeCaption(frame, cues);
  if (!cue) return null;
  const geometry = captionGeometry(
    cue.text,
    width,
    height,
    fontSize ?? caption.fontSize,
    bottom,
  );
  const fadeDuration = Math.min(
    motion.chip,
    (cue.endFrame - cue.startFrame) / 3,
  );
  return (
    <div
      aria-label={cue.text}
      style={{
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
        borderRadius: scales.corner(tokens.corner.scene),
        background: tokens.color.scene.ground,
        ...getStageTextStyle(caption, ["fontFamily", "fontWeight", "color"]),
        fontSize: geometry.fontSize,
        lineHeight: geometry.lineHeight,
        textAlign: "center",
        opacity: motion.ramp(
          frame,
          cue.startFrame,
          fadeDuration,
          motion.entrance.easing,
        ),
        pointerEvents: "none",
      }}
    >
      {geometry.lines.map((line, index) => {
        return <div key={index}>{line}</div>;
      })}
    </div>
  );
}
