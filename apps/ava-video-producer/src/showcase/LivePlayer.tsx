import { createRoot } from "react-dom/client";
import { HelperPlayer } from "../gallery/HelperGallery/HelperPlayer/HelperPlayer";
import { LIVE_FILM_ID } from "./liveFilmId";
import { LiveFilmPlayer } from "./LiveFilmPlayer";
import type { Film } from "./showcase.types";
import "../theme.css";
import "./player.css";

async function start() {
  const response = await fetch(
    `/api/films/${encodeURIComponent(LIVE_FILM_ID)}`,
  );
  if (!response.ok) {
    throw new Error("Film unavailable");
  }
  const film = (await response.json()) as Film;
  createRoot(document.getElementById("root")!).render(
    film.kind === "helper" ? (
      <HelperPlayer film={film} />
    ) : (
      <LiveFilmPlayer film={film} />
    ),
  );
}
start().catch(() => {
  document.getElementById("load-error")!.hidden = false;
});
