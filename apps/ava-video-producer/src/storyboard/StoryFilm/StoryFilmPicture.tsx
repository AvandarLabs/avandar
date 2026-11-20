import { VideoThemeScope } from "../../videoTheme/VideoThemeScope/VideoThemeScope";
import { FilmFrame } from "./FilmFrame";
import { makeThemePatchesFromTheme } from "./makeThemePatchesFromTheme/makeThemePatchesFromTheme";
import { type Props } from "./StoryFilmShared/StoryFilmShared.types";
import type { ReactNode } from "react";

type StoryFilmPictureOptions = Props & { frame: number };
/**
 * One frame of `StoryFilm`. The plan theme and each shot theme patch the
 * scene palette of the surrounding video theme (`classic` outside any
 * provider), so a shot's field colours can name theme swatches.
 */
export function StoryFilmPicture({
  plan,
  ...props
}: StoryFilmPictureOptions): ReactNode {
  return (
    <VideoThemeScope
      patches={makeThemePatchesFromTheme(plan.theme)}
      element="div"
    >
      <FilmFrame plan={plan} {...props} />
    </VideoThemeScope>
  );
}
