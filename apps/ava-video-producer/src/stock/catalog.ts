import { propEq, prop } from "@avandar/utils";
import { makeLocalizedStockDataFromContract } from "./i18n/makeLocalizedStockDataFromContract";
import { stockI18n } from "./i18n/stockI18n/stockI18n";
import { stockContracts } from "./registry/stockContracts";
import type { StockPresetId } from "./contracts/StockContract.types";
export type { StockPresetId } from "./contracts/StockContract.types";
export { STOCK_FPS, STOCK_LOOP_FRAMES } from "./registry/legacyStockEntry";

/** Compatibility display fields derived from the content-only registry. */
export type StockEntry = {
  id: StockPresetId;
  name: string;
  collection: "general" | "social-sector";
  searchText: string;
  category: string;
  description: string;
  tags: string[];
  useWhen: string;
  prompt: string;
  loopFrames: number;
};

/**
 * Stable references include every content contract with a registered renderer.
 */
export const STOCK_IDS = Object.keys(stockContracts) as StockPresetId[];

/** Display catalog shares the same definitions as content validation. */
export const STOCK_CATALOG: readonly StockEntry[] = STOCK_IDS.map((id) => {
  const contract = stockContracts[id];
  const { metadata } = makeLocalizedStockDataFromContract({
    contract,
    i18n: stockI18n,
  });
  return {
    id,
    collection: contract.collection,
    searchText: [
      metadata.intent,
      ...metadata.domains,
      ...metadata.aliases,
      ...metadata.goodFor,
      ...metadata.notFor,
      metadata.creativeDirection,
      metadata.distinction,
    ].join(" "),
    name: metadata.name,
    category: metadata.category,
    description: metadata.description,
    tags: metadata.tags,
    useWhen: metadata.useWhen,
    prompt: metadata.prompt,
    loopFrames: contract.loopFrames,
  };
});

/** Categories follow the registered catalog, including newly added families. */
export const STOCK_CATEGORIES: string[] = [
  ...new Set(STOCK_CATALOG.map(prop("category"))),
];
/** Display category names are provided by preset metadata. */
export type StockCategory = (typeof STOCK_CATEGORIES)[number];

/** Finds one public preset by its stable reference. */
export function stockEntry(id: string): StockEntry {
  const found = STOCK_CATALOG.find(
    propEq<{ id: unknown }, "id", unknown>("id", id),
  );
  if (!found) {
    throw new Error(`Unknown stock motion preset: ${id}`);
  }
  return found;
}
