import { abs } from "../../chrome/abs";
import { mixToken } from "../../motion";
import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import { useVideoShapeScales } from "../../videoTheme/useVideoShapeScales";
import { useVideoTheme } from "../../videoTheme/useVideoTheme";
import { FIELD, RUN_CLICK } from "./timeline";
import type { ReactNode } from "react";

/** The caret: a bar as tall as the typed line, beside it. */
const CARET = { width: 2, height: 28, gap: 3 };

/** The prompt field phase: a text field gaining focus, filling with the
 *  query, and a Run button answering the click. */
export function PromptField({
  frame,
  focus,
  text,
  typing,
}: {
  frame: number;
  focus: number;
  text: string;
  typing: boolean;
}): ReactNode {
  const theme = useVideoTheme();
  const { semantic, mantine, atomic } = theme;
  const scene = semantic.color.scene;
  const motion = useVideoMotion();
  const scales = useVideoShapeScales();
  const focusRing = `0 0 0 ${(focus * scales.stroke(semantic.stroke.emphasis)).toFixed(1)}px ${scene.brandSoft}`;
  return (
    <div
      style={{
        ...abs(FIELD),
        // No corner token holds the starter 14 px radius yet.
        borderRadius: "var(--radius)",
        background: scene.card,
        // The single most common defect this kit exists to prevent:
        // `focused ? scene.brand : scene.border`. That is a one-frame
        // teleport. Anchor a ramp at the frame the state changes and blend
        // the two tokens through it.
        border: `${scales.stroke(semantic.stroke.hairline)}px solid ${mixToken(focus, scene.border, scene.brand)}`,
        boxShadow: focusRing,
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        gap: 2,
      }}
    >
      <span
        style={{
          fontSize: mantine.fontSizes["6xl"],
          opacity: text ? 1 : atomic.opacity["45"],
        }}
      >
        {text || "Ask for anything"}
      </span>
      {/* A caret only while something is actually being typed. Static
       * copy in a field the flow claims is being filled reads as a
       * screenshot, and the viewer clocks it immediately. */}
      <span
        style={{
          width: CARET.width,
          height: CARET.height,
          marginLeft: CARET.gap,
          background: scene.brand,
          opacity: focus > 0.5 && (typing || motion.caretOn(frame)) ? 1 : 0,
        }}
      />

      <div
        style={{
          marginLeft: "auto",
          padding: "12px 28px",
          borderRadius: scales.corner(semantic.corner.label),
          // No size step holds the Run label's 19 px yet.
          fontSize: 19,
          fontWeight: atomic.fontWeight.semibold,
          color: mantine.white,
          background: scene.brand,
          // A press that answers back, and lands on exactly 1 so no
          // frame outside the beat is left transformed.
          transform: `scale(${motion.press(frame, RUN_CLICK).toFixed(4)})`,
        }}
      >
        Run
      </div>
    </div>
  );
}
