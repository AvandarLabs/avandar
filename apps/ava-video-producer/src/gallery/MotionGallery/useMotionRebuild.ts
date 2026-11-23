import { useEffect } from "react";
import { FilmDownloads } from "../../../showcase/FilmDownloads/FilmDownloads";
/** Keeps the motion gallery current after a rebuild, once downloads start. */
export function useMotionRebuild(): void {
  useEffect(function reloadOnRebuildNotification() {
    const events = new EventSource("/events");
    let generation: string | undefined;
    let cancelRefresh: (() => void) | undefined;
    events.onmessage = (event) => {
      if (generation !== undefined && generation !== event.data) {
        cancelRefresh?.();
        cancelRefresh = FilmDownloads.afterDownloads(() => {
          return location.reload();
        });
      }
      generation = event.data;
    };
    return () => {
      events.close();
      cancelRefresh?.();
    };
  }, []);
}
