import { VideoThemeScope } from "../../videoTheme/VideoThemeScope/VideoThemeScope";
import { makeThemePatchesFromTheme } from "./makeThemePatchesFromTheme/makeThemePatchesFromTheme";
import { ShotSurface } from "./ShotSurface";
import { type ShotLayerProps as Props } from "./StoryFilmShared/StoryFilmShared.types";
import type { ReactNode } from "react";
/** One opaque shot, painted on its own theme's ground. */
export function _ShotLayer(props: Props): ReactNode {
  return (
    <VideoThemeScope
      patches={makeThemePatchesFromTheme(props.shot.theme)}
      element="div"
    >
      <ShotSurface {...props} />
    </VideoThemeScope>
  );
}
