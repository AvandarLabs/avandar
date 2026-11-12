import { useLingui } from "@lingui/react/macro";
import { useEffect, useRef } from "react";
import { afterDownloads } from "../../../../showcase/download.js";
import { watchFilms } from "../../../../showcase/watch-films.js";
import { buildHelperFilmId } from "../helperCatalog";
import { useHelperCopy } from "../useHelperCopy";
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
      cancelRefresh = afterDownloads(() => location.reload());
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
  const { t } = useLingui();
  const translate = useHelperCopy();
  const player = useRef<HTMLIFrameElement>(null);
  useSourceWatch(helper.id, player);
  const title = translate(helper.title);
  return (
    <section className={css.preview} aria-label={t`Live preview`}>
      <div className={css.stage}>
        <iframe
          key={helper.id}
          ref={player}
          className={css.player}
          src={`/live.html?id=${encodeURIComponent(buildHelperFilmId(helper))}`}
          title={t`Live preview of ${title}`}
          allowFullScreen
        />
      </div>
      <p className={css.notice}>
        {t`Live React preview of the real helper, frame-driven and looping. Pause or scrub with the player controls.`}
      </p>
    </section>
  );
}
