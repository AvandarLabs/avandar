import { useMemo } from "react";
import { createContinuityPlanFromVideoThemeSnapshot } from "../../continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme";
import { VideoThemeProvider } from "../../videoTheme/VideoThemeProvider/VideoThemeProvider";
import { createVideoThemeSourceFromSnapshot } from "../../videoTheme/videoThemeSnapshotHelpers/videoThemeSnapshotHelpers";
import { FilmPicture } from "./FilmPicture";
import type { Film } from "../showcase.types";

/**
 * Shared picture for browser playback and serial frame rendering, themed
 * by the film's snapshot with the film id as its override scope. A stock
 * graphic or continuity beat inside adds its own nested scope.
 */
export function FilmComposition({
  film,
  withAudio = true,
}: {
  film: Film;
  withAudio?: boolean;
}) {
  // The picture and its audio cues follow the themed plan, the same plan the
  // film's frame count came from.
  const themedFilm = useMemo(
    () =>
      film.plan
        ? {
            ...film,
            plan: createContinuityPlanFromVideoThemeSnapshot(
              film.plan,
              film.theme,
              [film.id],
            ),
          }
        : film,
    [film],
  );
  return (
    <VideoThemeProvider
      source={createVideoThemeSourceFromSnapshot(film.theme, [film.id])}
    >
      <FilmPicture film={themedFilm} withAudio={withAudio} />
    </VideoThemeProvider>
  );
}
