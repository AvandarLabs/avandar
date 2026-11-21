import css from "./AtlasCollection.module.css";
import { AtlasCollectionEmptyState } from "./AtlasCollectionEmptyState/AtlasCollectionEmptyState";
import { AtlasCollectionIntro } from "./AtlasCollectionIntro/AtlasCollectionIntro";
import { AtlasCollectionToolbar } from "./AtlasCollectionToolbar/AtlasCollectionToolbar";
import type { ReactNode } from "react";

type Props = {
  eyebrow: string;
  title: ReactNode;
  description: string;
  /** Heading of the visible collection, for example the chosen category. */
  heading: string;
  resultCount: number;
  query: string;
  onQueryChange: (query: string) => void;
  searchLabel: string;
  searchPlaceholder: string;
  /** Extra toolbar controls after the search field, such as play and pause. */
  tools?: ReactNode;
  emptyTitle: string;
  onReset: () => void;
  resetLabel: string;
  /** The cards. Rendered in the shared grid when there is at least one. */
  children: ReactNode;
};

/**
 * The main column of a Motion Atlas section: introduction, a toolbar with
 * the visible count and search, then the card grid or an empty state.
 */
export function AtlasCollection({
  eyebrow,
  title,
  description,
  heading,
  resultCount,
  query,
  onQueryChange,
  searchLabel,
  searchPlaceholder,
  tools,
  emptyTitle,
  onReset,
  resetLabel,
  children,
}: Readonly<Props>): ReactNode {
  return (
    <main className={css.atlasCollectionLibraryMain} id="library" tabIndex={-1}>
      <AtlasCollectionIntro {...{ eyebrow, title, description }} />
      <section
        className={css.atlasCollectionCollection}
        aria-labelledby="collection-title"
      >
        <AtlasCollectionToolbar
          {...{
            heading,
            resultCount,
            searchLabel,
            searchPlaceholder,
            query,
            onQueryChange,
            tools,
          }}
        />
        {resultCount > 0 ? (
          <div className={css.atlasCollectionMotionGrid}>{children}</div>
        ) : (
          <AtlasCollectionEmptyState {...{ emptyTitle, onReset, resetLabel }} />
        )}
      </section>
    </main>
  );
}
