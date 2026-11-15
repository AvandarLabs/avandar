import { TYPE } from "../fonts";
import { DUR, ramp } from "../motion";
import {
  activeCaption,
  captionGeometry,
  validateCaptions,
} from "./layout/layout";
import type { CaptionOverlayProps } from "./scenes.types";

/** Whole-cue captions. Alignment comes from authored or imported cue times. */
export function CaptionOverlay({
  frame,
  cues,
  width = 1600,
  height = 1000,
  bottom = 48,
  fontSize = 38,
}: CaptionOverlayProps) {
  validateCaptions(cues);
  const cue = activeCaption(frame, cues);
  if (!cue) return null;
  const geometry = captionGeometry(cue.text, width, height, fontSize, bottom);
  const fadeDuration = Math.min(DUR.chip, (cue.endFrame - cue.startFrame) / 3);
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
        border: `${geometry.borderWidth}px solid var(--border)`,
        borderRadius: "var(--radius)",
        background: "var(--ground)",
        color: "var(--foreground)",
        fontFamily: TYPE,
        fontSize: geometry.fontSize,
        fontWeight: 500,
        lineHeight: geometry.lineHeight,
        textAlign: "center",
        opacity: ramp(frame, cue.startFrame, fadeDuration),
        pointerEvents: "none",
      }}
    >
      {geometry.lines.map((line, index) => (
        <div key={index}>{line}</div>
      ))}
    </div>
  );
}
