import { abs } from "../../chrome/abs";
import { mixToken } from "../../motion";
import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import { useVideoShapeScales } from "../../videoTheme/useVideoShapeScales";
import { useVideoTheme } from "../../videoTheme/useVideoTheme";
import { FIELD, RUN_CLICK } from "./timeline";
import type { ReactNode } from "react";

/** The caret: a bar as tall as the typed line, beside it. */
const CARET = { width: 2, height: 28 };

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
        borderRadius: scales.corner(semantic.corner.scene),
        background: scene.card,
        // The single most common defect this kit exists to prevent:
        // `focused ? scene.brand : scene.border`. That is a one-frame
        // teleport. Anchor a ramp at the frame the state changes and blend
        // the two tokens through it.
        border: `${scales.stroke(semantic.stroke.hairline)}px solid ${mixToken(focus, scene.border, scene.brand)}`,
        boxShadow: focusRing,
        display: "flex",
        alignItems: "center",
        padding: `0 ${mantine.spacing.xs}`,
        gap: mantine.spacing["2"],
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
          marginLeft: mantine.spacing["3"],
          background: scene.brand,
          opacity: focus > 0.5 && (typing || motion.caretOn(frame)) ? 1 : 0,
        }}
      />

      <div
        style={{
          marginLeft: "auto",
          padding: `${mantine.spacing["12"]} ${mantine.spacing["28"]}`,
          borderRadius: scales.corner(semantic.corner.label),
          fontSize: mantine.fontSizes["19"],
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
