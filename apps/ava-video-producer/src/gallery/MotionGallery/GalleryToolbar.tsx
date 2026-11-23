import { propEq } from "@avandar/utils";
import { STOCK_CATALOG } from "../../stock/catalog";
import { Icon } from "./Icon";
import type { Preset } from "./Preset.types";
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
    <div className="collection-toolbar">
      <div className="collection-heading">
        <h2 id="collection-title">
          {category === "All motions"
            ? "All motions"
            : category === "Saved references"
              ? "Saved references"
              : category}
        </h2>
        <span className="result-count">{results.length}</span>
      </div>
      <div className="toolbar-tools">
        <label className="sr-only" htmlFor="collection-filter">
          Collection
        </label>
        <select
          id="collection-filter"
          className="collection-filter"
          value={collection}
          onChange={(event) => setCollection(event.target.value)}
        >
          <option value="all">All collections ({STOCK_CATALOG.length})</option>
          {(["general", "social-sector"] as const).map((value) => (
            <option key={value} value={value}>
              {value === "general" ? "General and technology" : "Social sector"}{" "}
              {`(${STOCK_CATALOG.filter(propEq("collection", value)).length})`}
            </option>
          ))}
        </select>
        <div className="search-field">
          <Icon name="search" size={17} />
          <label className="sr-only" htmlFor="motion-search">
            Search motions
          </label>
          <input
            id="motion-search"
            type="search"
            placeholder="Search motions, ideas…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
          />
          {query ? (
            <button onClick={() => setQuery("")} aria-label="Clear search">
              <Icon name="close" size={14} />
            </button>
          ) : null}
        </div>
        <button
          className="play-all"
          onClick={() => setPlaying((value) => !value)}
          aria-label={playing ? "Pause all animations" : "Play all animations"}
        >
          <Icon name={playing ? "pause" : "play"} size={15} />
          <span>{playing ? "Pause all" : "Play all"}</span>
        </button>
      </div>
    </div>
  );
}
