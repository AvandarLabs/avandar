import { AtlasCollectionSearch } from "../AtlasCollectionSearch/AtlasCollectionSearch";
import css from "./AtlasCollectionToolbar.module.css";
import type { ReactNode } from "react";

type Props = {
  heading: string;
  resultCount: number;
  searchLabel: string;
  searchPlaceholder: string;
  query: string;
  onQueryChange: (query: string) => void;
  tools?: ReactNode;
};
/** Shows the Atlas collection heading, count, search, and extra controls. */
export function AtlasCollectionToolbar({
  heading,
  resultCount,
  searchLabel,
  searchPlaceholder,
  query,
  onQueryChange,
  tools,
}: Readonly<Props>): ReactNode {
  return (
    <div className={css.atlasCollectionToolbarCollectionToolbar}>
      <div className={css.atlasCollectionToolbarCollectionHeading}>
        <h2 id="collection-title">{heading}</h2>
        <span className={css.atlasCollectionToolbarResultCount}>
          {resultCount}
        </span>
      </div>
      <div className={css.atlasCollectionToolbarToolbarTools}>
        <AtlasCollectionSearch
          {...{ searchLabel, searchPlaceholder, query, onQueryChange }}
        />
        {tools}
      </div>
    </div>
  );
}
