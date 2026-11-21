import { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import { useVideoTheme } from "../../../videoTheme/videoThemeHelpers";
import { StageTheme } from "../../StageTheme/StageTheme";
import { TextReveal } from "../../TextReveal/TextReveal";
import type { Rect } from "../../layout/SceneGeometry";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  wordmark: string;
  box: Rect;
  fontSize: number;
  atFrame: number;
};
/** Wipes the themed wordmark text into its allocated rectangle. */
export function LockupWordmarkText({
  frame,
  wordmark,
  box,
  fontSize,
  atFrame,
}: Readonly<Props>): ReactNode {
  const theme = useVideoTheme();
  const motion = useVideoMotion();
  return (
    <div
      style={{
        fontSize,
        lineHeight: `${box.height}px`,
        ...StageTheme.getStageTextStyle({
          role: theme.semantic.text.stage.wordmark,
          fields: ["fontWeight", "letterSpacing"],
        }),
        whiteSpace: "nowrap",
        ...TextReveal.getLineRevealStyle({
          frame,
          at: atFrame,
          mode: "wipe",
          options: {},
          motion,
        }),
      }}
    >
      {wordmark}
    </div>
  );
}
