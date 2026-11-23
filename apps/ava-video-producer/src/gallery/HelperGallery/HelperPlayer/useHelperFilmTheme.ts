import { useEffect, useState } from "react";
import { FilmThemeMessages } from "../../../showcase/FilmThemeMessages/FilmThemeMessages";
import type { Film } from "../../../showcase/showcase.types";
import type { VideoThemeSnapshot } from "../../../videoTheme/VideoThemeSnapshots/VideoThemeSnapshots";
/**
 * The theme a helper's live player draws in: the film's own, until the
 * embedding Atlas page posts a `theme` control with its draft. Each posted
 * theme is acknowledged like a composition film's, so the page can tell a
 * refused snapshot from a slow one.
 */
export function useHelperFilmTheme(
  film: Pick<Film, "id" | "theme">,
): VideoThemeSnapshot | undefined {
  const [theme, setTheme] = useState(film.theme);
  useEffect(
    function listenForThemeControls() {
      const receive = (event: MessageEvent<unknown>) => {
        if (
          event.origin !== location.origin ||
          event.source !== window.parent
        ) {
          return;
        }
        const control = FilmThemeMessages.parseFilmControlMessage({
          data: event.data,
          id: film.id,
        });
        if (control?.action !== "theme") {
          return;
        }
        const { snapshot, message } =
          FilmThemeMessages.makeAcknowledgementFromTheme({
            id: film.id,
            value: control.value,
            requestKey: control.requestKey,
          });
        if (snapshot) {
          setTheme(snapshot);
        }
        window.parent.postMessage(message, location.origin);
      };
      window.addEventListener("message", receive);
      return () => {
        return window.removeEventListener("message", receive);
      };
    },
    [film.id],
  );
  return theme;
}
