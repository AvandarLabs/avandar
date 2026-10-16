import { Composition, registerRoot } from "remotion";
import "./player.css";
import "../theme.css";
import { FilmComposition } from "./FilmComposition";
import type { Film } from "./showcase.types";

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
function Root() {
  return (
    <Composition
      id="showcase-film"
      component={FilmComposition}
      defaultProps={{ film, withAudio: false }}
      durationInFrames={film.frames}
      width={film.width}
      height={film.height}
      fps={film.fps}
      calculateMetadata={({ props }) => ({
        durationInFrames: props.film.frames,
        width: props.film.width,
        height: props.film.height,
        fps: props.film.fps,
      })}
    />
  );
}
registerRoot(Root);
