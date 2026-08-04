import path from "node:path";

/** Navbar workspace menu button shows the workspace display name. */
export const SEEDED_WORKSPACE_MENU_BUTTON_NAME = /E2E Test Workspace/i;

/**
 * Row count reported after DuckDB parses `california-covid-sample.csv`
 * (full file; differs from `wc -l` minus header due to loader semantics).
 */
export const CALIFORNIA_CSV_EXPECTED_ROW_COUNT = 14700;

/**
 * Rows shown in the import preview success callout
 * (`AppConfig.dataManagerApp.maxPreviewRows`). Large files cap here even
 * when the saved dataset contains more rows.
 */
export const DATA_IMPORT_MAX_PREVIEW_ROWS = 200;

export const CALIFORNIA_CSV_PATH = path.join(
  process.cwd(),
  "tests/data/california-covid-sample/california-covid-sample.csv",
);

/** Same dataset as {@link CALIFORNIA_CSV_PATH}, exported as `.xlsx`. */
export const CALIFORNIA_XLSX_PATH = path.join(
  process.cwd(),
  "tests/data/california-covid-sample/california-covid-sample.xlsx",
);

export const CHOLERA_NYC_XLSX_PATH = path.join(
  process.cwd(),
  "tests/data/fake_cholera_nyc_linelist_geocoded/fake_cholera_nyc_linelist_geocoded.xlsx",
);

/**
 * Data rows after DuckDB parses `fake_cholera_nyc_linelist_geocoded.xlsx`
 * (excludes header row).
 */
export const CHOLERA_NYC_XLSX_EXPECTED_ROW_COUNT = 17367;

/**
 * 100-row slice of {@link CALIFORNIA_CSV_PATH} for tests where dataset size
 * doesn't matter and the parse + sync cycle should be as fast as possible.
 */
export const SMALL_CALIFORNIA_CSV_PATH = path.join(
  process.cwd(),
  "tests/data/small-california-covid-sample/small-california-covid-sample.csv",
);

/** Row count reported after DuckDB parses {@link SMALL_CALIFORNIA_CSV_PATH}. */
export const SMALL_CALIFORNIA_CSV_EXPECTED_ROW_COUNT = 100;

/** Same data as {@link SMALL_CALIFORNIA_CSV_PATH}, exported as `.xlsx`. */
export const SMALL_CALIFORNIA_XLSX_PATH = path.join(
  process.cwd(),
  "tests/data/small-california-covid-sample/small-california-covid-sample.xlsx",
);

/** 100-row slice of {@link CHOLERA_NYC_XLSX_PATH}. */
export const SMALL_CHOLERA_NYC_XLSX_PATH = path.join(
  process.cwd(),
  "tests/data/small-fake_cholera_nyc_linelist_geocoded/small-fake_cholera_nyc_linelist_geocoded.xlsx",
);

export const EXPECTED_CHOLERA_COLUMN_NAMES = [
  "id",
  "latitude",
  "longitude",
  "address",
  "number_of_cases",
] as const;

/**
 * Preview callout row count for imports where the file exceeds
 * {@link DATA_IMPORT_MAX_PREVIEW_ROWS}.
 */
export function formatImportPreviewRowCount(fileRowCount: number): string {
  const previewRows = Math.min(fileRowCount, DATA_IMPORT_MAX_PREVIEW_ROWS);
  return previewRows.toLocaleString("en-US");
}

export const EXPECTED_CSV_COLUMN_NAMES = [
  "Province_State",
  "Admin2",
  "Lat",
  "Long_",
  "date",
  "daily_new_cases",
] as const;
