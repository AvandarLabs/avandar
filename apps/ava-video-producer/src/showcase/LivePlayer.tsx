import { createRoot } from "react-dom/client";
import { HelperPlayer } from "../gallery/HelperGallery/HelperPlayer/HelperPlayer";
import { LIVE_FILM_ID } from "./liveFilmId";
import { LiveFilmPlayer } from "./LiveFilmPlayer";
import { loadFilm } from "./loadFilm/loadFilm";
import "../theme.css";
import "./player.css";

async function _start(): Promise<void> {
  const film = await loadFilm(LIVE_FILM_ID);
  createRoot(document.getElementById("root")!).render(
    film.kind === "helper" ? (
      <HelperPlayer film={film} />
    ) : (
      <LiveFilmPlayer film={film} />
    ),
  );
}
_start().catch(() => {
  document.getElementById("load-error")!.hidden = false;
});
