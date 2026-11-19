import { Icon } from "../../MotionGallery/Icon";
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
}: Props): ReactNode {
  return (
    <main className="library-main" id="library" tabIndex={-1}>
      <section className="library-intro" aria-labelledby="page-title">
        <div className="intro-copy">
          <p className="eyebrow">
            <span className="tiny-dot" />
            {eyebrow}
          </p>
          <h1 id="page-title">{title}</h1>
          <p>{description}</p>
        </div>
      </section>
      <section className="collection" aria-labelledby="collection-title">
        <div className="collection-toolbar">
          <div className="collection-heading">
            <h2 id="collection-title">{heading}</h2>
            <span className="result-count">{resultCount}</span>
          </div>
          <div className="toolbar-tools">
            <div className="search-field">
              <Icon name="search" size={17} />
              <label className="sr-only" htmlFor="atlas-search">
                {searchLabel}
              </label>
              <input
                id="atlas-search"
                type="search"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(event) => {
                  return onQueryChange(event.target.value);
                }}
                autoComplete="off"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    return onQueryChange("");
                  }}
                  aria-label="Clear search"
                >
                  <Icon name="close" size={14} />
                </button>
              ) : null}
            </div>
            {tools}
          </div>
        </div>
        {resultCount > 0 ? (
          <div className="motion-grid">{children}</div>
        ) : (
          <div className="empty-state">
            <Icon name="search" size={30} />
            <h3>{emptyTitle}</h3>
            <p>Try a different keyword, or explore the full collection.</p>
            <button type="button" className="button" onClick={onReset}>
              {resetLabel}
              <Icon name="arrow" size={16} />
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
