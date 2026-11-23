import { propIsInArray } from "@avandar/utils";
import { useMemo } from "react";
import { STOCK_CATALOG, type StockPresetId } from "../../stock/stockEntry";
import type { Preset } from "./Preset.types";
import type { MotionGalleryState } from "./useMotionGalleryState/useMotionGalleryState.types";

type Options = {
  category: string;
  collection: string;
  query: string;
  saved: readonly StockPresetId[];
  selected: Preset | undefined;
};
/** Filters motion references and locates adjacent entries in catalog order. */
export function useMotionResults({
  category,
  collection,
  query,
  saved,
  selected,
}: Readonly<Options>): Pick<
  MotionGalleryState,
  "results" | "previousPreset" | "nextPreset" | "savedPresets"
> {
  const results = useMemo(() => {
    return STOCK_CATALOG.filter((preset) => {
      return (
        (collection === "all" || preset.collection === collection) &&
        (category === "All motions" ||
          (category === "Saved references"
            ? saved.includes(preset.id)
            : preset.category === category)) &&
        [
          preset.name,
          preset.id,
          preset.description,
          preset.useWhen,
          preset.searchText,
          ...preset.tags,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase().trim())
      );
    });
  }, [category, collection, query, saved]);
  const selectedCatalogIndex = selected ? STOCK_CATALOG.indexOf(selected) : -1;
  const previousPreset = [...results].reverse().find((preset) => {
    return STOCK_CATALOG.indexOf(preset) < selectedCatalogIndex;
  });
  const nextPreset = results.find((preset) => {
    return STOCK_CATALOG.indexOf(preset) > selectedCatalogIndex;
  });
  const savedPresets = STOCK_CATALOG.filter(propIsInArray("id", saved));

  return { results, previousPreset, nextPreset, savedPresets };
}
