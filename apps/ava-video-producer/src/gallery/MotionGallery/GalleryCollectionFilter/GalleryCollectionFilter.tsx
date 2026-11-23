import { propEq } from "@avandar/utils";
import { STOCK_CATALOG } from "../../../stock/stockEntry";
import css from "./GalleryCollectionFilter.module.css";
import type { ReactNode } from "react";

type Props = { collection: string; setCollection: (value: string) => void };
/** Selects the preset collection in GalleryToolbar. */
export function GalleryCollectionFilter({
  collection,
  setCollection,
}: Readonly<Props>): ReactNode {
  return (
    <select
      id="collection-filter"
      className={css.galleryCollectionFilterCollectionFilter}
      value={collection}
      onChange={(event) => {
        return setCollection(event.target.value);
      }}
    >
      <option value="all">All collections ({STOCK_CATALOG.length})</option>
      {(["general", "social-sector"] as const).map((value) => {
        return (
          <option key={value} value={value}>
            {value === "general" ? "General and technology" : "Social sector"}{" "}
            {`(${STOCK_CATALOG.filter(propEq("collection", value)).length})`}
          </option>
        );
      })}
    </select>
  );
}
