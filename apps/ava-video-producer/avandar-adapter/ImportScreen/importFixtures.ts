import { Model } from "@avandar/models";
import { EXPLORER_CASES_DATASET_ID } from "../Explorer.constants";
import fixtureData from "../fixtures.json";
import type { CsvFileDataset } from "$/models/datasets/CsvFileDataset/CsvFileDataset";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { DataSourceMetadata } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm.types";

/**
 * The saved dataset's display name, reused across its upload review and saved
 * detail views.
 */
export const NAME = "Video - Harborfield cases";
/**
 * The saved dataset's description, shown on its upload review and detail
 * views.
 */
export const DESCRIPTION =
  "Fictional Harborfield response-coordination data. Reproducible fixtures from avandar-video-agent/demo-data.";
/**
 * The data sources the source list shows: the Harborfield fixture dataset
 * names the capture flows import (`FIXTURE_NAMES` in `ensureDataset`),
 * without the weekly reports dataset, which the source list does not show.
 */
export const SOURCE_NAMES = [
  "Video - Harborfield cases",
  "Video - Harborfield visits",
  "Video - Harborfield facilities",
  "Video - Harborfield districts",
];
const NUMERIC_COLUMNS = new Set(["latitude", "longitude", "household_size"]);
const DATE_COLUMNS = new Set(["report_date", "week_start"]);

/** The fictional Harborfield cases rows this screen imports and previews. */
export const cases = fixtureData.cases;
/** The fixture case rows' column names, in file order. */
export const columnNames = Object.keys(cases[0]!);

/**
 * Column metadata inferred from the fixture rows, in the shape the dataset
 * preview and metadata view expect.
 */
// Fixture records carry only the fields this film shows. Filling the rest of
// the product type would put invented values on screen, so the cast stays.
export const columns = columnNames.map((name, index) => {
  return Model.make("DatasetColumn", {
    id: `film-case-column-${index}`,
    name,
    description: undefined,
    dataType: DATE_COLUMNS.has(name)
      ? "date"
      : NUMERIC_COLUMNS.has(name)
        ? name === "household_size"
          ? "bigint"
          : "double"
        : "varchar",
  });
}) as DatasetColumn.T[];

/** The saved dataset record this screen's "saved" phase displays. */
// Fixture records carry only the fields this film shows. Filling the rest of
// the product type would put invented values on screen, so the cast stays.
export const dataset = Model.make("Dataset", {
  id: EXPLORER_CASES_DATASET_ID,
  name: NAME,
  description: DESCRIPTION,
  sourceType: "csv_file",
  createdAt: "2026-10-14T21:53:32Z",
  isRestricted: false,
  dateOfLastSync: undefined,
}) as Dataset.T;

/** The CSV source configuration backing `dataset`. */
// Fixture records carry only the fields this film shows. Filling the rest of
// the product type would put invented values on screen, so the cast stays.
export const source = Model.make("CsvFileDataset", {
  sizeInBytes: 26703,
  delimiter: ",",
  hasHeader: true,
  rowsToSkip: 0,
  dateFormat: "%Y-%m-%d",
  timestampFormat: undefined,
  isInCloudStorage: true,
}) as CsvFileDataset.T;

/** The parse metadata shown in the import review's preview controls. */
// Fixture records carry only the fields this film shows. Filling the rest of
// the product type would put invented values on screen, so the cast stays.
export const metadata = {
  sourceType: "csv_file",
  onlineStorageAllowed: true,
  parseOptions: { delimiter: ",", numRowsToSkip: 0 },
  datasetLoadResult: { id: dataset.id, columns },
} as unknown as DataSourceMetadata;
