import { useVideoMotion } from "../../videoTheme/useVideoMotion";
import { useVideoTheme } from "../../videoTheme/videoThemeHelpers";
import type { ReactNode } from "react";

const CARET = { width: 2, height: 28 };
type Props = {
  frame: number;
  focus: number;
  text: string;
  typing: boolean;
};
/** Draws the prompt copy and the typing caret on the authored frame. */
export function PromptFieldText({
  frame,
  focus,
  text,
  typing,
}: Readonly<Props>): ReactNode {
  const { semantic, mantine, atomic } = useVideoTheme();
  const scene = semantic.color.scene;
  const motion = useVideoMotion();
  return (
    <>
      <span
        style={{
          fontSize: mantine.fontSizes["6xl"],
          opacity: text ? 1 : atomic.opacity["45"],
        }}
      >
        {text || "Ask for anything"}
      </span>
      <span
        style={{
          width: CARET.width,
          height: CARET.height,
          marginLeft: mantine.spacing["3"],
          background: scene.brand,
          opacity: focus > 0.5 && (typing || motion.caretOn(frame)) ? 1 : 0,
        }}
      />
    </>
  );
}
