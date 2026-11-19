import { useCallback, useEffect, useMemo, useRef } from "react";
import { afterDownloads } from "../../../../showcase/download.js";
import { watchFilms } from "../../../../showcase/watch-films.js";
import { createSnapshotFromDraft } from "../../../videoThemeEditor/themeDraft/themeDraft";
import { useGalleryVideoTheme } from "../../GalleryVideoTheme/useGalleryVideoTheme";
import { buildHelperFilmId } from "../helperCatalog";
import css from "./HelperPreview.module.css";
import type { HelperEntry } from "../helperCatalog.types";
import type { ReactNode, RefObject } from "react";

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
 * Posts the gallery's theme draft, scoped to the helper, to its live player
 * whenever the draft changes. Returns the post, for the player's `load`.
 */
function useThemePost(
  helper: HelperEntry,
  player: RefObject<HTMLIFrameElement | null>,
): () => void {
  const { library, themeId, validDraft } = useGalleryVideoTheme();
  const snapshot = useMemo(() => {
    return createSnapshotFromDraft({
      library,
      themeId,
      draft: validDraft,
      itemId: helper.id,
    });
  }, [library, themeId, validDraft, helper.id]);
  const post = useCallback(() => {
    player.current?.contentWindow?.postMessage(
      {
        type: "film-control",
        id: buildHelperFilmId(helper),
        action: "theme",
        value: snapshot,
      },
      location.origin,
    );
  }, [helper, player, snapshot]);
  useEffect(post, [post]);
  return post;
}

/**
 * The open helper's live, looping preview, drawn in the gallery's theme. The
 * Atlas preview modal around it owns the title and the previous and next
 * buttons.
 */
export function HelperPreview({ helper }: Props): ReactNode {
  const player = useRef<HTMLIFrameElement>(null);
  useSourceWatch(helper.id, player);
  const postTheme = useThemePost(helper, player);
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
          onLoad={postTheme}
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
