import type { useVideoShapeScales } from "../../../../videoTheme/useVideoShapeScales";
import type { useVideoTokens } from "../../../../videoTheme/videoThemeHelpers";
import type { ReactNode } from "react";

type Props = {
  tilt: number;
  scales: ReturnType<typeof useVideoShapeScales>;
  scene: ReturnType<typeof useVideoTokens>["color"]["scene"];
  titlebar: number;
  tokens: ReturnType<typeof useVideoTokens>;
};
/** Renders window titlebar. */
export function WindowTitlebar({
  tilt,
  scales,
  scene,
  titlebar,
  tokens,
}: Readonly<Props>): ReactNode {
  return (
    <div
      style={{
        height: titlebar,
        background: scene.card,
        borderBottom: `${scales.stroke(tokens.stroke.hairline)}px solid ${scene.border}`,
        opacity: tilt,
      }}
    />
  );
}
