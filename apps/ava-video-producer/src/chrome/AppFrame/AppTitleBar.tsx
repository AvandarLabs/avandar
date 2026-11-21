import { StageTheme } from "../../scenes/StageTheme/StageTheme";
import { useVideoShapeScales } from "../../videoTheme/useVideoShapeScales";
import {
  useVideoTheme,
  useVideoTokens,
} from "../../videoTheme/videoThemeHelpers";
import { AppFrameShared } from "./AppFrameShared/AppFrameShared";
import type { CSSProperties, ReactNode } from "react";

type Props = { w: number; title: string; rule: string };

/** The window title bar: three dots and the window title. */
export function AppTitleBar({ w, title, rule }: Readonly<Props>): ReactNode {
  const tokens = useVideoTokens();
  const { spacing } = useVideoTheme().mantine;
  const scales = useVideoShapeScales();
  const scene = tokens.color.scene;
  const dot: CSSProperties = {
    width: AppFrameShared.DOT_SIZE,
    height: AppFrameShared.DOT_SIZE,
    borderRadius: scales.corner(tokens.corner.pill),
    background: scene.border,
    display: "block",
  };
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        width: w,
        height: AppFrameShared.BAR,
        display: "flex",
        alignItems: "center",
        gap: spacing["8"],
        padding: `0 ${spacing["2xs"]}`,
        borderBottom: rule,
        background: scene.background,
        ...StageTheme.getStageTextStyle({ role: tokens.text.stage.appBody }),
      }}
    >
      <i style={dot} />
      <i style={dot} />
      <i style={dot} />
      {title}
    </div>
  );
}
