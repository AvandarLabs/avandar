let requestNumber = 0;

/**
 * The parts of a film's iframe the watcher reads and writes: its address and
 * the window it posts reload requests to. An `HTMLIFrameElement` satisfies it.
 */
type FilmPlayer = {
  src: string;
  contentWindow: {
    postMessage(message: unknown, targetOrigin: string): void;
  } | null;
};

function _reloadPlayer(player: FilmPlayer): void {
  const source = player.src;
  if (!source) {
    return;
  }
  const url = new URL(source, window.location.href);
  if (url.origin === window.location.origin) {
    player.src = source;
  }
}

/** The same-origin player a `film-reloading` message came from, if any. */
function _getAcknowledgingPlayer(
  players: readonly FilmPlayer[],
  event: MessageEvent,
): FilmPlayer | undefined {
  return event.origin === window.location.origin &&
    event.data?.type === "film-reloading"
    ? players.find((candidate) => {
        return candidate.contentWindow === event.source;
      })
    : undefined;
}

/**
 * Asks each player to reload in place and navigates it again only when it
 * does not acknowledge the request within a second.
 */
function _createReloadController(players: readonly FilmPlayer[]): {
  request: (player: FilmPlayer) => void;
  dispose: () => void;
} {
  const pending = new Map<
    FilmPlayer,
    { requestId: string; timer: ReturnType<typeof setTimeout> }
  >();
  const cancel = (player: FilmPlayer) => {
    const request = pending.get(player);
    if (request) {
      clearTimeout(request.timer);
    }
    pending.delete(player);
  };
  const acknowledge = (event: MessageEvent) => {
    const player = _getAcknowledgingPlayer(players, event);
    if (player && pending.get(player)?.requestId === event.data.requestId) {
      cancel(player);
    }
  };
  window.addEventListener("message", acknowledge);
  return {
    request: (player: FilmPlayer) => {
      cancel(player);
      requestNumber += 1;
      const requestId = `film-reload-${requestNumber}`;
      const timer = setTimeout(() => {
        pending.delete(player);
        _reloadPlayer(player);
      }, 1000);
      pending.set(player, { requestId, timer });
      player.contentWindow?.postMessage(
        { type: "film-control", action: "reload", requestId },
        window.location.origin,
      );
    },
    dispose: () => {
      pending.forEach(({ timer }) => {
        return clearTimeout(timer);
      });
      pending.clear();
      window.removeEventListener("message", acknowledge);
    },
  };
}

/**
 * Share one source watcher per gallery and let responsive players retain state.
 * Reload unresponsive same-origin iframes after an acknowledgement deadline.
 * Returns a function that closes the watcher.
 */
export function watchFilms(
  players: readonly FilmPlayer[],
  onReload?: () => void,
): () => void {
  let galleryTimer: ReturnType<typeof setTimeout> | undefined;
  const events = new EventSource("/events");
  const reloads = _createReloadController(players);
  let generation: string | undefined;
  events.addEventListener("message", (event: MessageEvent<string>) => {
    const hasChanged = generation !== undefined && event.data !== generation;
    generation = event.data;
    if (!hasChanged) {
      return;
    }
    players.forEach((player) => {
      return reloads.request(player);
    });
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
