import { downloadFilm } from "./download.js";
/* eslint-disable-next-line import-x/extensions -- Native browser modules require the .js extension. */
import { watchFilms } from "./watch-films.js";

const films = [...document.querySelectorAll(".production-card")].map(
  (card) => ({
    id: card.id,
    player: card.querySelector("iframe"),
    button: card.querySelector("[data-download]"),
    status: card.querySelector("[data-export-status]"),
    options: {},
  }),
);

window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin || !event.data) return;
  const film = films.find(
    ({ player }) => player.contentWindow === event.source,
  );
  if (!film) return;
  if (event.data.type === "film-options" && event.data.id === film.id) {
    film.options = { captions: event.data.options?.captions !== false };
  }
  if (event.data.type !== "film-playing") return;
  films.forEach(({ player }) => {
    if (player !== film.player) {
      player.contentWindow?.postMessage(
        { type: "film-control", action: "pause" },
        window.location.origin,
      );
    }
  });
});

films.forEach((film) => {
  film.button.addEventListener("click", async () => {
    if (film.button.disabled) return;
    film.button.disabled = true;
    film.button.setAttribute("aria-busy", "true");
    try {
      await downloadFilm({
        id: film.id,
        options: film.options,
        onStatus: (job) => {
          film.status.hidden = false;
          film.status.textContent = job.message;
          film.status.dataset.state = job.state;
        },
      });
    } catch {
      /* The shared downloader reports failures in this card's live status. */
    } finally {
      film.button.disabled = false;
      film.button.removeAttribute("aria-busy");
    }
  });
  film.player.src = film.player.dataset.src;
});
watchFilms(films.map(({ player }) => player));
