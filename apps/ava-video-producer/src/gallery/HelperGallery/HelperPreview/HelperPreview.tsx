import { useEffect, useRef } from "react";
import { afterDownloads } from "../../../../showcase/download.js";
import { watchFilms } from "../../../../showcase/watch-films.js";
import { buildHelperFilmId } from "../helperCatalog";
import css from "./HelperPreview.module.css";
import type { HelperEntry } from "../helperCatalog.types";
import type { RefObject } from "react";

type Props = {
  helper: HelperEntry;
};

/** Refreshes the live player when the helper or gallery source changes. */
function useSourceWatch(
  id: string,
  player: RefObject<HTMLIFrameElement | null>,
) {
  useEffect(() => {
    if (!player.current) {
      return;
    }
    let cancelRefresh: (() => void) | undefined;
    const stopWatching = watchFilms([player.current], () => {
      cancelRefresh?.();
      cancelRefresh = afterDownloads(() => {
        return location.reload();
      });
    });
    return () => {
      stopWatching();
      cancelRefresh?.();
    };
  }, [id, player]);
}

/**
 * The open helper's live, looping preview. The Atlas preview modal around it
 * owns the title and the previous and next buttons.
 */
export function HelperPreview({ helper }: Props) {
  const player = useRef<HTMLIFrameElement>(null);
  useSourceWatch(helper.id, player);
  const title = helper.title;
  return (
    <section className={css.preview} aria-label="Live preview">
      <div className={css.stage}>
        <iframe
          key={helper.id}
          ref={player}
          className={css.player}
          src={`/live.html?id=${encodeURIComponent(buildHelperFilmId(helper))}`}
          title={`Live preview of ${title}`}
          allowFullScreen
        />
      </div>
      <p className={css.notice}>
        {
          "Live React preview of the real helper, frame-driven and looping. Pause or scrub with the player controls."
        }
      </p>
    </section>
  );
}
