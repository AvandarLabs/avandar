import { abs } from "../../chrome/abs";
import { Motion } from "../../motion";
import { useVideoShapeScales } from "../../videoTheme/useVideoShapeScales";
import { useVideoTheme } from "../../videoTheme/videoThemeHelpers";
import { PromptFieldText } from "./PromptFieldText";
import { RunPromptButton } from "./RunPromptButton";
import { FIELD } from "./timeline";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  focus: number;
  text: string;
  typing: boolean;
};
/**
 * The prompt field phase: a text field gaining focus, filling with the
 * query, and a Run button answering the click.
 */
export function PromptField({
  frame,
  focus,
  text,
  typing,
}: Readonly<Props>): ReactNode {
  const theme = useVideoTheme();
  const { semantic, mantine } = theme;
  const scene = semantic.color.scene;
  const scales = useVideoShapeScales();
  const focusRing = `0 0 0 ${(focus * scales.stroke(semantic.stroke.emphasis)).toFixed(1)}px ${scene.brandSoft}`;
  // A caret only while something is actually being typed. Static copy in a
  // field the flow claims is being filled reads as a screenshot, and the viewer
  // clocks it immediately.
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
        border: `${scales.stroke(semantic.stroke.hairline)}px solid ${Motion.mixToken(
          {
            t: focus,
            from: scene.border,
            to: scene.brand,
          },
        )}`,
        boxShadow: focusRing,
        display: "flex",
        alignItems: "center",
        padding: `0 ${mantine.spacing.xs}`,
        gap: mantine.spacing["2"],
      }}
    >
      <PromptFieldText {...{ frame, focus, text, typing }} />

      <RunPromptButton frame={frame} />
    </div>
  );
}
