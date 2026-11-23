import { AvandarScene } from "../../avandar/AvandarScene/AvandarScene";
import { StoryFilm } from "../../storyboard/StoryFilm/StoryFilm";
import { FilmCueAudio } from "./FilmCueAudio";
import { FilmSoundEffects } from "./FilmSoundEffects";
import { FilmTrackAudio } from "./FilmTrackAudio";
import type { Film } from "../showcase.types";
import type { ReactNode } from "react";

type Props = Readonly<{ film: Film; withAudio: boolean }>;
/** Renders the authored storyboard with the requested audio channels. */
export function StoryboardFilmPicture({ film, withAudio }: Props): ReactNode {
  if (!film.plan) {
    throw new Error("Storyboard film requires a plan");
  }
  return (
    <>
      <StoryFilm
        plan={film.plan}
        productScene={AvandarScene}
        showCaptions={film.showCaptions}
      />
      {withAudio ? (
        <>
          <FilmCueAudio plan={film.plan} />
          <FilmTrackAudio plan={film.plan} />
          <FilmSoundEffects plan={film.plan} />
        </>
      ) : null}
    </>
  );
}
