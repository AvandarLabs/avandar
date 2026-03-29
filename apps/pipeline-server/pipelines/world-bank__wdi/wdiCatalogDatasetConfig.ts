/**
 * Catalog copy for each WDI bulk CSV table (Parquet stem =
 * filename without `.csv`).
 */
export type WdiCatalogDatasetPresentation = Readonly<{
  display_name: string;
  description: string;
}>;

const WDI_CATALOG_DATASET_CONFIG: Readonly<
  Record<string, WdiCatalogDatasetPresentation>
> = {
  WDICSV: {
    display_name: "World Development Indicators (WDI)",
    description:
      "Primary WDI matrix: economies and aggregates, one indicator per " +
      "row, annual values in year columns.",
  },
  WDICountry: {
    display_name: "WDI: Country and economy metadata",
    description:
      "Economy reference: names, regions, income groups, currencies, " +
      "and national accounts metadata.",
  },
  WDISeries: {
    display_name: "WDI: Indicator definitions",
    description:
      "Series catalog: topic, definitions, unit, periodicity, " +
      "methodology, sources, and limitations per indicator code.",
  },
  "WDIcountry-series": {
    display_name: "WDI: Country–series source notes",
    description:
      "Per-economy notes on primary sources and compilation for " +
      "specific indicators.",
  },
  WDIfootnote: {
    display_name: "WDI: Indicator footnotes",
    description:
      "Footnotes for breaks, revisions, or caveats for a country, " +
      "series, and year.",
  },
  "WDIseries-time": {
    display_name: "WDI: Series time notes",
    description:
      "Notes keyed to series and year (e.g. regional aggregation " +
      "windows) that apply across economies.",
  },
};

/**
 * Returns catalog `display_name` and `description` for a WDI Parquet stem.
 *
 * @param tableBaseName Filename stem (e.g. `WDICSV`, `WDIcountry-series`).
 * @throws If the stem is not present in the WDI catalog config.
 */
export function getWdiCatalogDatasetPresentation(options: {
  tableBaseName: string;
}): WdiCatalogDatasetPresentation {
  const { tableBaseName } = options;
  const entry = WDI_CATALOG_DATASET_CONFIG[tableBaseName];

  if (entry === undefined) {
    throw new Error(
      `Missing WDI catalog presentation for table "${tableBaseName}".`,
    );
  }

  return entry;
}
