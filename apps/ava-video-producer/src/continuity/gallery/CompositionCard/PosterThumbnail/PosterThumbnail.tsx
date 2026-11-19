import { useState } from "react";
import css from "./PosterThumbnail.module.css";
import type { ReactNode } from "react";

type Props = Readonly<{
  id: string;
  themeId: string;
}>;

/**
 * A card thumbnail: the theme's poster, then the `classic` poster with a
 * badge, then a placeholder when neither loads. `key={poster}` remounts the
 * image when it falls back, so the fallback gets its own load and error events.
 */
export function PosterThumbnail({ id, themeId }: Props): ReactNode {
  const [failedSources, setFailedSources] = useState<ReadonlySet<string>>(
    () => {
      return new Set();
    },
  );
  // The posters tried in order: the theme's, then `classic`'s.
  const sources = [...new Set([themeId, "classic"])].map((theme) => {
    return `assets/atlas/${theme}/${id}.jpg`;
  });
  const poster = sources.find((source) => {
    return !failedSources.has(source);
  });
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
        onError={() => {
          return setFailedSources((failed) => {
            return new Set([...failed, poster]);
          });
        }}
      />
      {poster === sources[0] ? null : (
        <span className={css.posterThumbnailFallback}>
          {"Preview in classic theme"}
        </span>
      )}
    </>
  );
}
