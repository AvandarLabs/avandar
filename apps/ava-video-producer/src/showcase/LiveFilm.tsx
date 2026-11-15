import { Player, type PlayerRef } from "@remotion/player";
import { FilmComposition } from "./FilmComposition/FilmComposition";
import type { RefObject } from "react";
import type { Film } from "./showcase.types";

type Props = Readonly<{
  film: Film;
  player: RefObject<PlayerRef | null>;
  previewFrames: number;
  captions: boolean;
  speed: number;
  loop: boolean;
  autoPlay: boolean;
  initialFrame: number;
}>;

/** The embedded Remotion player for a live film, with the gallery's transport applied. */
export function LiveFilm({
  film,
  player,
  previewFrames,
  captions,
  speed,
  loop,
  autoPlay,
  initialFrame,
}: Props) {
  return (
    <Player
      ref={player}
      component={FilmComposition}
      inputProps={{
        film: { ...film, frames: previewFrames, showCaptions: captions },
      }}
      compositionWidth={film.width}
      compositionHeight={film.height}
      durationInFrames={previewFrames}
      fps={film.fps}
      controls
      loop={loop}
      playbackRate={speed}
      autoPlay={autoPlay}
      initialFrame={initialFrame}
      style={{ width: "100%" }}
      clickToPlay={false}
      spaceKeyToPlayOrPause
      errorFallback={() => (
        <p className="liveError">
          Preview unavailable. Check the showcase terminal, then reload.
        </p>
      )}
    />
  );
}
