import { useLingui } from "@lingui/react/macro";
import { useState } from "react";
import { AtlasCard } from "../../../gallery/AtlasLayout/AtlasCard/AtlasCard";
import { isSceneEntry } from "../../continuityCatalog";
import css from "./CompositionCard.module.css";
import type { ContinuityCatalogEntry } from "../../continuityCatalog";

type Props = {
  entry: ContinuityCatalogEntry;
  category: string;
  /** The active video theme. A theme with no poster shows the `classic` one. */
  themeId?: string;
  onOpen: (id: string) => void;
};

/** The posters a card tries in order: the theme's, then `classic`'s. */
function _posterSources(id: string, themeId: string): readonly string[] {
  return [...new Set([themeId, "classic"])].map(
    (theme) => `assets/atlas/${theme}/${id}.jpg`,
  );
}

/**
 * A card thumbnail: the theme's poster, then the `classic` poster with a
 * badge, then a placeholder when neither loads. `key={poster}` remounts the
 * image when it falls back, so the fallback gets its own load and error events.
 */
function PosterThumbnail({ id, themeId }: { id: string; themeId: string }) {
  const { t } = useLingui();
  const [failedSources, setFailedSources] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const sources = _posterSources(id, themeId);
  const poster = sources.find((source) => !failedSources.has(source));
  if (poster === undefined) {
    return <span className={css.missing}>{t`NO POSTER YET`}</span>;
  }
  return (
    <>
      <img
        key={poster}
        className={css.poster}
        src={poster}
        alt=""
        loading="lazy"
        onError={() =>
          setFailedSources((failed) => new Set([...failed, poster]))
        }
      />
      {poster === sources[0] ? null : (
        <span className={css.fallback}>{t`Preview in classic theme`}</span>
      )}
    </>
  );
}

/**
 * A composition or sample film card. Its thumbnail is the tracked poster
 * that `pnpm atlas:posters --theme <id>` renders from the live composition,
 * falling back to the `classic` poster with a badge when the active theme
 * has none. The live player itself opens in the preview modal.
 */
export function CompositionCard({
  entry,
  category,
  themeId = "classic",
  onOpen,
}: Props) {
  const { t } = useLingui();
  const seconds = Math.round(entry.frames / 30);
  return (
    <AtlasCard
      title={entry.title}
      category={category}
      description={entry.description}
      reference={entry.id}
      badge={
        <span className="card-state">
          <i />
          {isSceneEntry(entry) ? t`STORYBOARD SCENES` : t`CONTINUITY`} ·{" "}
          {t`${seconds} SEC`}
        </span>
      }
      thumbnail={<PosterThumbnail id={entry.id} themeId={themeId} />}
      onOpen={() => onOpen(entry.id)}
    />
  );
}
