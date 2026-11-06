let requestNumber = 0;

function reloadPlayer(player) {
  const source = player.src;
  if (!source) return;
  const url = new URL(source, window.location.href);
  if (url.origin === window.location.origin) player.src = source;
}

function createReloadController(players) {
  const pending = new Map();
  const cancel = (player) => {
    const request = pending.get(player);
    if (request) clearTimeout(request.timer);
    pending.delete(player);
  };
  const acknowledge = (event) => {
    if (
      event.origin !== window.location.origin ||
      event.data?.type !== "film-reloading"
    )
      return;
    const player = players.find(
      (candidate) => candidate.contentWindow === event.source,
    );
    if (player && pending.get(player)?.requestId === event.data.requestId)
      cancel(player);
  };
  window.addEventListener("message", acknowledge);
  return {
    request(player) {
      cancel(player);
      requestNumber += 1;
      const requestId = `film-reload-${requestNumber}`;
      const timer = setTimeout(() => {
        pending.delete(player);
        reloadPlayer(player);
      }, 1000);
      pending.set(player, { requestId, timer });
      player.contentWindow?.postMessage(
        { type: "film-control", action: "reload", requestId },
        window.location.origin,
      );
    },
    dispose() {
      pending.forEach(({ timer }) => clearTimeout(timer));
      pending.clear();
      window.removeEventListener("message", acknowledge);
    },
  };
}

/**
 * Share one source watcher per gallery and let responsive players retain state.
 * Reload unresponsive same-origin iframes after an acknowledgement deadline.
 */
export function watchFilms(players, onReload) {
  let galleryTimer;
  const events = new EventSource("/events");
  const reloads = createReloadController(players);
  let generation;
  events.addEventListener("message", (event) => {
    const hasChanged = generation !== undefined && event.data !== generation;
    generation = event.data;
    if (!hasChanged) return;
    players.forEach((player) => reloads.request(player));
    if (onReload) {
      clearTimeout(galleryTimer);
      galleryTimer = setTimeout(onReload, 1100);
    }
  });
  return () => {
    clearTimeout(galleryTimer);
    events.close();
    reloads.dispose();
  };
}
