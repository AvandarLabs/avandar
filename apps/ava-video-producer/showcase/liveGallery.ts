import { prop } from "@avandar/utils";
import { FilmDownloads } from "./FilmDownloads/FilmDownloads";
import { watchFilms } from "./watchFilms/watchFilms";

type ProductionFilm = {
  id: string;
  player: HTMLIFrameElement;
  button: HTMLButtonElement;
  status: HTMLElement;
  options: { captions?: boolean };
};

/** Reads one production card's player, download button, and status line. */
function _createFilmFromCard(card: HTMLElement): ProductionFilm {
  const player = card.querySelector<HTMLIFrameElement>("iframe");
  const button = card.querySelector<HTMLButtonElement>("[data-download]");
  const status = card.querySelector<HTMLElement>("[data-export-status]");
  if (!player || !button || !status) {
    throw new Error(`Production card ${card.id} is incomplete.`);
  }
  return { id: card.id, player, button, status, options: {} };
}

const films = [
  ...document.querySelectorAll<HTMLElement>(".production-card"),
].map(_createFilmFromCard);

window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin || !event.data) {
    return;
  }
  const film = films.find(({ player }) => {
    return player.contentWindow === event.source;
  });
  if (!film) {
    return;
  }
  if (event.data.type === "film-options" && event.data.id === film.id) {
    film.options = { captions: event.data.options?.captions !== false };
  }
  if (event.data.type !== "film-playing") {
    return;
  }
  films.forEach(({ player }) => {
    if (player !== film.player) {
      player.contentWindow?.postMessage(
        { type: "film-control", action: "pause" },
        window.location.origin,
      );
    }
  });
});

async function _downloadFilmFromCard(film: ProductionFilm): Promise<void> {
  if (film.button.disabled) {
    return;
  }
  film.button.disabled = true;
  film.button.setAttribute("aria-busy", "true");
  try {
    await FilmDownloads.downloadFilm({
      id: film.id,
      options: film.options,
      onStatus: (job) => {
        film.status.hidden = false;
        film.status.textContent = job.message;
        film.status.dataset.state = job.state;
      },
    });
  } catch {
    // The shared downloader reports failures in this card's live status.
  } finally {
    film.button.disabled = false;
    film.button.removeAttribute("aria-busy");
  }
}

films.forEach((film) => {
  film.button.addEventListener("click", () => {
    return _downloadFilmFromCard(film);
  });
  film.player.src = film.player.dataset.src ?? "";
});
watchFilms(films.map(prop("player")));
