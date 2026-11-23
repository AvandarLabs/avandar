import { GalleryCollectionFilter } from "../GalleryCollectionFilter/GalleryCollectionFilter";
import { GalleryMotionSearch } from "../GalleryMotionSearch/GalleryMotionSearch";
import { GalleryPlaybackToggle } from "../GalleryPlaybackToggle/GalleryPlaybackToggle";
import css from "./GalleryToolbar.module.css";
import type { Preset } from "../Preset.types";
import type { ReactNode, Dispatch, SetStateAction } from "react";

type Props = {
  category: string;
  results: Preset[];
  collection: string;
  setCollection: (value: string) => void;
  query: string;
  setQuery: (value: string) => void;
  playing: boolean;
  setPlaying: Dispatch<SetStateAction<boolean>>;
};
/** Collection filters, search, and shared playback controls. */
export function GalleryToolbar({
  category,
  results,
  collection,
  setCollection,
  query,
  setQuery,
  playing,
  setPlaying,
}: Readonly<Props>): ReactNode {
  return (
    <div className={css.galleryToolbarCollectionToolbar}>
      <div className={css.galleryToolbarCollectionHeading}>
        <h2 id="collection-title">
          {category === "All motions"
            ? "All motions"
            : category === "Saved references"
              ? "Saved references"
              : category}
        </h2>
        <span className={css.galleryToolbarResultCount}>{results.length}</span>
      </div>
      <div className={css.galleryToolbarToolbarTools}>
        <label className={css.galleryToolbarSrOnly} htmlFor="collection-filter">
          Collection
        </label>
        <GalleryCollectionFilter {...{ collection, setCollection }} />
        <GalleryMotionSearch {...{ query, setQuery }} />
        <GalleryPlaybackToggle {...{ playing, setPlaying }} />
      </div>
    </div>
  );
}
