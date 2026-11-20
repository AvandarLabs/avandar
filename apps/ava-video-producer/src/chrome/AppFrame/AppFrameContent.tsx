import { useVideoShapeScales } from "../../videoTheme/useVideoShapeScales";
import { useVideoTokens } from "../../videoTheme/useVideoTheme";
import { type Props } from "./AppFrameShared/AppFrameShared.types";
import { AppHeader } from "./AppHeader";
import { AppTitleBar } from "./AppTitleBar";
import type { ReactNode } from "react";
/** Assembles the themed title bar and page heading for `AppFrame`. */
export function AppFrameContent({ w, title, heading, sub }: Props): ReactNode {
  const tokens = useVideoTokens();
  const scales = useVideoShapeScales();
  const rule = `${scales.stroke(tokens.stroke.hairline)}px solid ${tokens.color.scene.border}`;
  return (
    <>
      <AppTitleBar w={w} title={title} rule={rule} />
      <AppHeader w={w} heading={heading} sub={sub} rule={rule} />
    </>
  );
}
