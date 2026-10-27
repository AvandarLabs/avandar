/** Semantic-only retrieval copy, excluding fixtures and source provenance. */
export type StockSearchMetadata = {
  name: string;
  description: string;
  intent: string;
  creativeDirection: string;
  goodFor: string[];
  domains: string[];
  aliases: string[];
  tags: string[];
  notFor: string[];
  distinction: string;
};

/** Builds stable semantic retrieval text from ordered public metadata. */
export function makeStockSearchTextFromMetadata(
  entry: Readonly<StockSearchMetadata>,
): string {
  return [
    entry.name,
    entry.description,
    entry.intent,
    entry.creativeDirection,
    ...entry.goodFor,
    ...entry.domains,
    ...entry.aliases,
    ...entry.tags,
    ...entry.notFor,
    entry.distinction,
  ]
    .map((text) => text.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .join("\n");
}
