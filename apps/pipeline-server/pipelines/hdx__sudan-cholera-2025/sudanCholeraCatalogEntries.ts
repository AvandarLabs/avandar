/**
 * The HDX resources the Sudan cholera 2025 demonstration reads, as
 * `api_resource` open data catalog entries.
 *
 * These are registrations, not a pipeline: an `api_resource` entry names a
 * resource that an external API serves and Avandar fetches on demand, so
 * nothing is extracted, transformed, or uploaded here. What the catalog needs
 * is the dataset and resource ids to ask CKAN for, the format to expect, and
 * the column list the import form builds its dataset columns from.
 *
 * Every field below is copied from the resource's own CKAN metadata on
 * data.humdata.org. Column names come from the resource's header row.
 */

/** The CKAN instance that serves every entry here. */
export const HDX_API_BASE_URL = "https://data.humdata.org" as const;

/** One column of an API-backed resource, in the resource's own order. */
export type SudanCholeraCatalogColumn = Readonly<{
  columnName: string;
  /**
   * The DuckDB type the column is read as. `VARCHAR` for every column of a
   * CSV resource: the CSV carries no types, and reading text and casting later
   * keeps a value that does not fit a guessed type visible instead of null.
   */
  originalDataType: string;
}>;

/** One HDX resource, with the catalog copy that describes it to a reader. */
export type SudanCholeraCatalogEntry = Readonly<{
  displayName: string;
  description: string;
  externalOrganizationName: string;
  externalServiceName: string;
  /** The CKAN dataset (package) name that contains the resource. */
  externalDatasetId: string;
  /** The CKAN resource id inside that dataset. */
  apiResourceId: string;
  /** The format CKAN reports for the resource. */
  apiResourceFormat: string;
  sourceUrl: string;
  canonicalUrls: readonly string[];
  license: string;
  updateFrequency: string;
  notes: string;
  columns: readonly SudanCholeraCatalogColumn[];
}>;

function _varcharColumns(
  columnNames: readonly string[],
): SudanCholeraCatalogColumn[] {
  return columnNames.map((columnName) => {
    return { columnName, originalDataType: "VARCHAR" };
  });
}

/**
 * The WFP rainfall resource is the five-year-to-date extract rather than the
 * full history. The full resource is about 36 MB, above the acquisition
 * ceiling, and the demonstration only reads 2025 dekads, so the smaller
 * resource is the correct one rather than a compromise.
 */
const SUDAN_RAINFALL_SUBNATIONAL: SudanCholeraCatalogEntry = {
  displayName: "Sudan: rainfall indicators by state (WFP, 5-year to date)",
  description:
    "Dekadal rainfall indicators by Sudan state, computed by WFP from CHIRPS " +
    "v2 satellite and station data and aggregated to Admin 1. Covers the most " +
    "recent five years to date. `rfh` is 10-day rainfall in mm, `r1h` and " +
    "`r3h` are 1-month and 3-month rolling totals, and the `_avg` columns are " +
    "the long-term average for the same dekad, so a dekad can be compared " +
    "against its own normal.",
  externalOrganizationName: "WFP - World Food Programme",
  externalServiceName: "Humanitarian Data Exchange (CKAN)",
  externalDatasetId: "sdn-rainfall-subnational",
  apiResourceId: "9359abcf-d1fc-41dd-b2a5-f27278e87bd7",
  apiResourceFormat: "CSV",
  sourceUrl: "https://data.humdata.org/dataset/sdn-rainfall-subnational",
  canonicalUrls: [
    "https://data.humdata.org/dataset/sdn-rainfall-subnational",
    "https://data.humdata.org/api/3/action/package_show?id=sdn-rainfall-subnational",
  ],
  license: "CC BY 4.0",
  updateFrequency: "Every ten days",
  notes:
    "Rainfall is an environmental stressor, not a cause of a state's cholera " +
    "burden. Use it to explain where response becomes harder, not to attribute " +
    "cases.",
  columns: _varcharColumns([
    "date",
    "adm_level",
    "adm_id",
    "PCODE",
    "n_pixels",
    "rfh",
    "rfh_avg",
    "r1h",
    "r1h_avg",
    "r3h",
    "r3h_avg",
    "rfq",
    "r1q",
    "r3q",
    "version",
  ]),
};

/**
 * The IOM displacement resource is the 25 June 2025 bi-weekly Admin 1 master
 * list. Registered as `CSV` because that is the content kind the acquisition
 * path reads; the resource CKAN serves is the round's workbook.
 */
const SUDAN_DISPLACEMENT_ADMIN1: SudanCholeraCatalogEntry = {
  displayName:
    "Sudan: internally displaced people by state (IOM DTM, 25 June 2025)",
  description:
    "Internally displaced people by state of displacement and state of " +
    "origin, from the IOM Displacement Tracking Matrix Sudan bi-weekly master " +
    "list, round 19, dated 25 June 2025. The round reports 10,065,329 IDPs " +
    "countrywide, of which 5,758,903 are in the five Darfur states.",
  externalOrganizationName: "IOM - International Organization for Migration",
  externalServiceName: "Humanitarian Data Exchange (CKAN)",
  externalDatasetId: "sudan-displacement-situation-countrywide-idps-iom-dtm",
  apiResourceId: "fa36e2cf-ef9a-4891-9645-7aadd28c09d8",
  apiResourceFormat: "XLSX",
  sourceUrl:
    "https://data.humdata.org/dataset/sudan-displacement-situation-countrywide-idps-iom-dtm",
  canonicalUrls: [
    "https://data.humdata.org/dataset/sudan-displacement-situation-countrywide-idps-iom-dtm",
  ],
  license: "CC BY-IGO",
  updateFrequency: "Every two weeks",
  notes:
    "The header row sits below a three-row title block, so an import of this " +
    "workbook has to skip three rows.",
  columns: _varcharColumns([
    "STATE OF DISPLACEMET",
    "STATE CODE",
    "IDPs",
    "HHs",
  ]),
};

/** The registration's entry list. */
type CatalogEntryList = readonly SudanCholeraCatalogEntry[];

/** Every entry this registration writes, in display order. */
export const SUDAN_CHOLERA_CATALOG_ENTRIES: CatalogEntryList = [
  SUDAN_RAINFALL_SUBNATIONAL,
  SUDAN_DISPLACEMENT_ADMIN1,
];
