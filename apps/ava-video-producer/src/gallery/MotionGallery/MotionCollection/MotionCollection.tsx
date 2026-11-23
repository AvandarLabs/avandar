import { GalleryToolbar } from "../GalleryToolbar/GalleryToolbar";
import { MotionCollectionSummary } from "../MotionCollectionSummary/MotionCollectionSummary";
import { MotionLibraryEmptyState } from "../MotionLibraryEmptyState";
import { MotionResultGrid } from "../MotionResultGrid/MotionResultGrid";
import css from "./MotionCollection.module.css";
import type { MotionGalleryState } from "../useMotionGalleryState/useMotionGalleryState.types";
import type { ReactNode } from "react";

type Props = {
  state: Readonly<MotionGalleryState>;
  savedIds: ReadonlySet<string>;
};
/** Combines MotionLibrary filters, results, and empty-state actions. */
export function MotionCollection({
  state,
  savedIds,
}: Readonly<Props>): ReactNode {
  const {
    category,
    results,
    collection,
    setCollection,
    query,
    setQuery,
    playing,
    setPlaying,
    selected,
    drafts,
    onOpen,
    onSave,
    selectCategory,
  } = state;
  return (
    <section
      className={css.motionCollectionCollection}
      aria-labelledby="collection-title"
    >
      <GalleryToolbar
        category={category}
        results={results}
        collection={collection}
        setCollection={setCollection}
        query={query}
        setQuery={setQuery}
        playing={playing}
        setPlaying={setPlaying}
      />
      <MotionCollectionSummary {...{ category }} />
      {results.length ? (
        <MotionResultGrid
          {...{ results, playing, selected, drafts, savedIds, onOpen, onSave }}
        />
      ) : (
        <MotionLibraryEmptyState {...{ category, query, selectCategory }} />
      )}
    </section>
  );
}
