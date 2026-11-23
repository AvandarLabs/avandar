import { useCallback, useEffect, useMemo, useRef } from "react";
import { FilmDownloads } from "../../../../showcase/FilmDownloads/FilmDownloads";
import { watchFilms } from "../../../../showcase/watchFilms/watchFilms";
import { ThemeDrafts } from "../../../videoThemeEditor/ThemeDrafts/ThemeDrafts";
import { useGalleryVideoTheme } from "../../GalleryVideoTheme/useGalleryVideoTheme";
import { HelperFilmIds } from "../HelperFilmIds";
import css from "./HelperPreview.module.css";
import type { HelperEntry } from "../helperCatalog.types";
import type { ReactNode, RefObject } from "react";

type Props = {
  helper: HelperEntry;
};
/** Refreshes the live player when the helper or gallery source changes. */
function useSourceWatch({
  id,
  player,
}: Readonly<{
  id: string;
  player: RefObject<HTMLIFrameElement | null>;
}>) {
  useEffect(
    function refreshHelperAfterSourceBuild() {
      if (!player.current) {
        return;
      }
      let cancelRefresh: (() => void) | undefined;
      const stopWatching = watchFilms({
        players: [player.current],
        onReload: () => {
          cancelRefresh?.();
          cancelRefresh = FilmDownloads.afterDownloads(() => {
            return location.reload();
          });
        },
      });
      return () => {
        stopWatching();
        cancelRefresh?.();
      };
    },
    [id, player],
  );
}
/**
 * Posts the gallery's theme draft, scoped to the helper, to its live player
 * whenever the draft changes. Returns the post, for the player's `load`.
 */
function useThemePost({
  helper,
  player,
}: Readonly<{
  helper: HelperEntry;
  player: RefObject<HTMLIFrameElement | null>;
}>): () => void {
  const { library, themeId, validDraft } = useGalleryVideoTheme();
  const snapshot = useMemo(() => {
    return ThemeDrafts.toSnapshot({
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
        id: HelperFilmIds.fromHelperId(helper),
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
  useSourceWatch({
    id: helper.id,
    player,
  });
  const postTheme = useThemePost({ helper, player });
  const title = helper.title;
  const playerFrame = (
    // Do not add `sandbox` without `allow-same-origin`: `/live.html` is a
    // first-party player that reads `sessionStorage` and verifies
    // `event.origin === location.origin` on `postMessage`.
    // react-doctor-disable-next-line react-doctor/iframe-missing-sandbox
    <iframe
      key={helper.id}
      ref={player}
      className={css.helperPreviewPlayer}
      src={`/live.html?id=${encodeURIComponent(HelperFilmIds.fromHelperId(helper))}`}
      title={`Live preview of ${title}`}
      onLoad={postTheme}
      allowFullScreen
    />
  );
  return (
    <section className={css.helperPreviewPreview} aria-label="Live preview">
      <div className={css.helperPreviewStage}>{playerFrame}</div>
      <p className={css.helperPreviewNotice}>
        {
          "Live React preview of the real helper, frame-driven and looping. Pause or scrub with the player controls."
        }
      </p>
    </section>
  );
}
