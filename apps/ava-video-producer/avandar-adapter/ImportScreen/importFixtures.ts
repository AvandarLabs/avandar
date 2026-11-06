import { EXPLORER_CASES_DATASET_ID } from "../Explorer.constants";
import fixtureData from "../fixtures.json";
import type { CsvFileDataset } from "$/models/datasets/CsvFileDataset/CsvFileDataset";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { DataSourceMetadata } from "@/views/DataManagerApp/DataImportView/DatasetImportForm/DatasetImportForm.types";

/** The saved dataset's display name, reused across its upload review and saved detail views. */
export const NAME = "Video - Harborfield cases";
export const DESCRIPTION =
  "Fictional Harborfield response-coordination data. Reproducible fixtures from avandar-video-agent/demo-data.";
// Names from capture-flows/avandar.mjs, with only the task-owned dataset list.
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
export const columnNames = Object.keys(cases[0]!);

/** Column metadata inferred from the fixture rows, in the shape the dataset preview and metadata view expect. */
export const columns = columnNames.map((name, index) => ({
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
})) as unknown as DatasetColumn.T[];

/** The saved dataset record this screen's "saved" phase displays. */
export const dataset = {
  __type: "Dataset",
  id: EXPLORER_CASES_DATASET_ID,
  name: NAME,
  description: DESCRIPTION,
  sourceType: "csv_file",
  createdAt: "2026-10-14T21:53:32Z",
  isRestricted: false,
  dateOfLastSync: undefined,
} as unknown as Dataset.T;

/** The CSV source configuration backing `dataset`. */
export const source = {
  __type: "CsvFileDataset",
  sizeInBytes: 26703,
  delimiter: ",",
  hasHeader: true,
  rowsToSkip: 0,
  dateFormat: "%Y-%m-%d",
  timestampFormat: undefined,
  isInCloudStorage: true,
} as unknown as CsvFileDataset.T;

/** The parse metadata shown in the import review's preview controls. */
export const metadata = {
  sourceType: "csv_file",
  onlineStorageAllowed: true,
  parseOptions: { delimiter: ",", numRowsToSkip: 0 },
  datasetLoadResult: { id: dataset.id, columns },
} as unknown as DataSourceMetadata;
