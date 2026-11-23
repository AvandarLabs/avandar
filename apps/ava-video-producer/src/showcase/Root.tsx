import { Composition } from "remotion";
import { FilmComposition } from "./FilmComposition/FilmComposition";
import type { Film } from "./showcase.types";
import type { ReactNode } from "react";

const film: Film = {
  id: "title-study",
  kind: "title-study",
  source: "",
  frames: 252,
  fps: 30,
  width: 1600,
  height: 1000,
  delivery: { width: 1536, height: 960 },
  loop: true,
  showCaptions: true,
};

/** The Remotion root that renders one showcase film at a time. */
export function Root(): ReactNode {
  return (
    <Composition
      id="showcase-film"
      component={FilmComposition}
      defaultProps={{ film, withAudio: false }}
      durationInFrames={film.frames}
      width={film.width}
      height={film.height}
      fps={film.fps}
      calculateMetadata={({ props }) => {
        return {
          durationInFrames: props.film.frames,
          width: props.film.width,
          height: props.film.height,
          fps: props.film.fps,
        };
      }}
    />
  );
}
