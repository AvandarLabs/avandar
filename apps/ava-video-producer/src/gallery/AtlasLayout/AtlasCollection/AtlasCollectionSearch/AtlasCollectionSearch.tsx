import { Icon } from "../../../MotionGallery/Icon";
import css from "./AtlasCollectionSearch.module.css";
import type { ReactNode } from "react";

type Props = {
  searchLabel: string;
  searchPlaceholder: string;
  query: string;
  onQueryChange: (query: string) => void;
};
/** Edits the collection query from the AtlasCollection toolbar. */
export function AtlasCollectionSearch({
  searchLabel,
  searchPlaceholder,
  query,
  onQueryChange,
}: Readonly<Props>): ReactNode {
  return (
    <div className={css.atlasCollectionSearchSearchField}>
      <Icon name="search" size={17} />
      <label className={css.atlasCollectionSearchSrOnly} htmlFor="atlas-search">
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
  );
}
