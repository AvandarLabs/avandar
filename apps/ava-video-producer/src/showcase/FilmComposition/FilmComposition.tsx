import { useMemo } from "react";
import { ContinuityThemePlans } from "../../continuity/ContinuityThemePlans/ContinuityThemePlans";
import { VideoThemeProvider } from "../../videoTheme/VideoThemeProvider/VideoThemeProvider";
import { VideoThemeSnapshots } from "../../videoTheme/VideoThemeSnapshots/VideoThemeSnapshots";
import { FilmPicture } from "./FilmPicture";
import type { Film } from "../showcase.types";
import type { ReactNode } from "react";

type Props = {
  film: Film;
  withAudio?: boolean;
};
/**
 * Shared picture for browser playback and serial frame rendering, themed
 * by the film's snapshot with the film id as its override scope. A stock
 * graphic or continuity beat inside adds its own nested scope.
 */
export function FilmComposition({
  film,
  withAudio = true,
}: Readonly<Props>): ReactNode {
  // The picture and its audio cues follow the themed plan, the same plan the
  // film's frame count came from.
  const themedFilm = useMemo(() => {
    return film.plan
      ? {
          ...film,
          plan: ContinuityThemePlans.fromVideoThemeSnapshot({
            plan: film.plan,
            snapshot: film.theme,
            overrideIds: [film.id],
          }),
        }
      : film;
  }, [film]);
  return (
    <VideoThemeProvider
      source={VideoThemeSnapshots.toSource({
        snapshot: film.theme,
        overrideIds: [film.id],
      })}
    >
      <FilmPicture film={themedFilm} withAudio={withAudio} />
    </VideoThemeProvider>
  );
}
