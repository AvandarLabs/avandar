import path from "node:path";

/** Navbar workspace menu button shows the workspace display name. */
export const SEEDED_WORKSPACE_MENU_BUTTON_NAME = /E2E Test Workspace/i;

/**
 * Row count reported after DuckDB parses `california-covid-sample.csv`
 * (matches UI; differs from `wc -l` minus header due to loader semantics).
 */
export const CALIFORNIA_CSV_EXPECTED_ROW_COUNT = 14700;

export const CALIFORNIA_CSV_PATH = path.join(
  process.cwd(),
  "tests/data/california-covid-sample.csv",
);

/** Same dataset as {@link CALIFORNIA_CSV_PATH}, exported as `.xlsx`. */
export const CALIFORNIA_XLSX_PATH = path.join(
  process.cwd(),
  "tests/data/california-covid-sample.xlsx",
);

export const CHOLERA_NYC_XLSX_PATH = path.join(
  process.cwd(),
  "tests/data/fake_cholera_nyc_linelist_geocoded.xlsx",
);

/**
 * Data rows after DuckDB parses `fake_cholera_nyc_linelist_geocoded.xlsx`
 * (excludes header row).
 */
export const CHOLERA_NYC_XLSX_EXPECTED_ROW_COUNT = 17367;

export const EXPECTED_CHOLERA_COLUMN_NAMES = [
  "id",
  "latitude",
  "longitude",
  "address",
  "number_of_cases",
] as const;

export const EXPECTED_CSV_COLUMN_NAMES = [
  "Province_State",
  "Admin2",
  "Lat",
  "Long_",
  "date",
  "daily_new_cases",
] as const;
