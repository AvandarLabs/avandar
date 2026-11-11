import { useLingui } from "@lingui/react/macro";
import { useEffect, useRef } from "react";
import { afterDownloads } from "../../../../showcase/download.js";
import { watchFilms } from "../../../../showcase/watch-films.js";
import { Icon, type IconName } from "../../MotionGallery/Icon";
import { buildHelperFilmId } from "../helperCatalog";
import { useHelperCopy } from "../useHelperCopy";
import css from "./HelperPreview.module.css";
import type { HelperEntry } from "../helperCatalog.types";
import type { RefObject } from "react";

type Props = {
  helper: HelperEntry;
  onPrevious?: () => void;
  onNext?: () => void;
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

/** The preview's title and its previous and next buttons. */
function PreviewHeader({
  title,
  onPrevious,
  onNext,
}: {
  title: string;
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  const { t } = useLingui();
  const actions: Array<{ label: string; icon: IconName; action?: () => void }> =
    [
      { label: t`Previous helper`, icon: "previous", action: onPrevious },
      { label: t`Next helper`, icon: "arrow", action: onNext },
    ];
  return (
    <header className="dialog-header">
      <h2 id="helper-preview-title" className={css.title} aria-live="polite">
        {title}
      </h2>
      <div className={css.navigation}>
        {actions.map(({ label, icon, action }) => (
          <button
            key={icon}
            type="button"
            className="icon-button"
            onClick={action}
            disabled={!action}
            aria-label={label}
            title={label}
          >
            <Icon name={icon} />
          </button>
        ))}
      </div>
    </header>
  );
}

/** The selected helper's live, looping preview with previous and next. */
export function HelperPreview({ helper, onPrevious, onNext }: Props) {
  const { t } = useLingui();
  const translate = useHelperCopy();
  const player = useRef<HTMLIFrameElement>(null);
  useSourceWatch(helper.id, player);
  const title = translate(helper.title);
  return (
    <section className={css.preview} aria-labelledby="helper-preview-title">
      <PreviewHeader title={title} onPrevious={onPrevious} onNext={onNext} />
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
