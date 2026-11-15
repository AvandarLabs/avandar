import { useState } from "react";
import css from "./PosterThumbnail.module.css";

type Props = Readonly<{
  id: string;
  themeId: string;
}>;

/**
 * A card thumbnail: the theme's poster, then the `classic` poster with a
 * badge, then a placeholder when neither loads. `key={poster}` remounts the
 * image when it falls back, so the fallback gets its own load and error events.
 */
export function PosterThumbnail({ id, themeId }: Props) {
  const [failedSources, setFailedSources] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  // The posters tried in order: the theme's, then `classic`'s.
  const sources = [...new Set([themeId, "classic"])].map(
    (theme) => `assets/atlas/${theme}/${id}.jpg`,
  );
  const poster = sources.find((source) => !failedSources.has(source));
  if (poster === undefined) {
    return <span className={css.missing}>{"NO POSTER YET"}</span>;
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
        <span className={css.posterThumbnailFallback}>
          {"Preview in classic theme"}
        </span>
      )}
    </>
  );
}
