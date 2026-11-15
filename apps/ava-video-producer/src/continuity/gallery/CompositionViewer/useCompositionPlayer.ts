import { useEffect } from "react";
import { afterDownloads } from "../../../../showcase/download.js";
import { watchFilms } from "../../../../showcase/watch-films.js";
import type { RefObject } from "react";

function _isOptionsMessage(data: unknown): data is {
  type: "film-options";
  id: string;
  options: { captions: boolean };
} {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    data.type === "film-options" &&
    "id" in data &&
    typeof data.id === "string" &&
    "options" in data &&
    typeof data.options === "object" &&
    data.options !== null &&
    "captions" in data.options &&
    typeof data.options.captions === "boolean"
  );
}

/** One source watcher and caption handshake scoped to the current live iframe. */
export function useCompositionPlayer(options: {
  id: string;
  player: RefObject<HTMLIFrameElement | null>;
  onOptions: (options: { id: string; captions: boolean }) => void;
}) {
  const { id, player, onOptions } = options;
  useEffect(() => {
    if (!player.current) {
      return;
    }
    let cancelRefresh: (() => void) | undefined;
    const stopWatching = watchFilms([player.current], () => {
      cancelRefresh?.();
      cancelRefresh = afterDownloads(() => location.reload());
    });
    return () => {
      stopWatching();
      cancelRefresh?.();
    };
  }, [id, player]);
  useEffect(() => {
    const receive = (event: MessageEvent<unknown>) => {
      if (
        event.origin !== location.origin ||
        event.source !== player.current?.contentWindow ||
        !_isOptionsMessage(event.data) ||
        event.data.id !== id
      ) {
        return;
      }
      onOptions({ id, captions: event.data.options.captions });
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [id, onOptions, player]);
}
