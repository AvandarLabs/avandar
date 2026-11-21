import { AbsoluteFill } from "remotion";
import { useVideoTokens } from "../../videoTheme/videoThemeHelpers";
import { ShotView } from "./ShotView";
import { type ShotLayerProps as Props } from "./StoryFilmShared/StoryFilmShared.types";
import type { ReactNode } from "react";
/** Paints a shot on its themed background for `_ShotLayer`. */
export function ShotSurface({
  shot,
  frame,
  width,
  height,
  productScene,
  style,
}: Props): ReactNode {
  const tokens = useVideoTokens();
  return (
    <AbsoluteFill style={{ background: tokens.color.scene.ground, ...style }}>
      <ShotView
        shot={shot}
        frame={frame}
        width={width}
        height={height}
        productScene={productScene}
      />
    </AbsoluteFill>
  );
}
