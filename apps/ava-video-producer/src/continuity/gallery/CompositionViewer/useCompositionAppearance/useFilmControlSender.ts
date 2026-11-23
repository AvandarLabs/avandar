import { useCallback } from "react";
import type { RefObject } from "react";

type Options = { id: string; player: RefObject<HTMLIFrameElement | null> };
/** Send a control only to the active same-origin film iframe. */
export function useFilmControlSender({
  id,
  player,
}: Readonly<Options>): (action: string, value?: unknown) => void {
  const send = useCallback(
    (action: string, value?: unknown) => {
      return player.current?.contentWindow?.postMessage(
        { type: "film-control", id, action, value },
        location.origin,
      );
    },
    [id, player],
  );
  return send;
}
