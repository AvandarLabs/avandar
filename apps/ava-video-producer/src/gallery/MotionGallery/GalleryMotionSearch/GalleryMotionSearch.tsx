import { Icon } from "../Icon";
import css from "./GalleryMotionSearch.module.css";
import type { ReactNode } from "react";

type Props = { query: string; setQuery: (value: string) => void };
/** Edits or clears the motion search query in GalleryToolbar. */
export function GalleryMotionSearch({
  query,
  setQuery,
}: Readonly<Props>): ReactNode {
  return (
    <div className={css.galleryMotionSearchSearchField}>
      <Icon name="search" size={17} />
      <label className={css.galleryMotionSearchSrOnly} htmlFor="motion-search">
        Search motions
      </label>
      <input
        id="motion-search"
        type="search"
        placeholder="Search motions, ideas…"
        value={query}
        onChange={(event) => {
          return setQuery(event.target.value);
        }}
        autoComplete="off"
      />
      {query ? (
        <button
          onClick={() => {
            return setQuery("");
          }}
          aria-label="Clear search"
        >
          <Icon name="close" size={14} />
        </button>
      ) : null}
    </div>
  );
}
