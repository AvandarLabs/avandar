import path from "node:path";
import { GlobalAppConfig } from "$/config/GlobalAppConfig";

/** Navbar workspace menu button shows the workspace display name. */
export const SEEDED_WORKSPACE_MENU_BUTTON_NAME = /E2E Test Workspace/i;

/**
 * Row count reported after DuckDB parses `california-covid-sample.csv`
 * (full file; differs from `wc -l` minus header due to loader semantics).
 */
export const CALIFORNIA_CSV_EXPECTED_ROW_COUNT = 14700;

/**
 * Rows shown in the import preview success callout
 * (`GlobalAppConfig.dataManagerApp.maxPreviewRows`). Large files cap here even
 * when the saved dataset contains more rows.
 */
export const DATA_IMPORT_MAX_PREVIEW_ROWS =
  GlobalAppConfig.dataManagerApp.maxPreviewRows;

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

/** Directory of GIS geometry, boundary, and point CSV fixtures. */
const GIS_WAVE_B_DATA_DIR = path.join(process.cwd(), "tests/data/gis-wave-b");

/** Polygon WKT CSV used by GIS geometry-column e2e tests. */
export const GIS_WAVE_B_GEOMETRY_CSV_PATH = path.join(
  GIS_WAVE_B_DATA_DIR,
  "gis-wave-b-geometry.csv",
);
/** Boundary-name CSV used by GIS join e2e tests. */
export const GIS_WAVE_B_BOUNDARIES_CSV_PATH = path.join(
  GIS_WAVE_B_DATA_DIR,
  "gis-wave-b-boundaries.csv",
);
/** Lat/lng point CSV used by GIS coordinate-binding e2e tests. */
export const GIS_WAVE_B_POINTS_CSV_PATH = path.join(
  GIS_WAVE_B_DATA_DIR,
  "gis-wave-b-points.csv",
);
/** Pre-aggregated area CSV used by GIS choropleth e2e tests. */
export const GIS_WAVE_B_SUMMARY_CSV_PATH = path.join(
  GIS_WAVE_B_DATA_DIR,
  "gis-wave-b-summary.csv",
);

/** Parsed row count of {@link GIS_WAVE_B_GEOMETRY_CSV_PATH}. */
export const GIS_WAVE_B_GEOMETRY_ROW_COUNT = 4;
/** Parsed row count of {@link GIS_WAVE_B_BOUNDARIES_CSV_PATH}. */
export const GIS_WAVE_B_BOUNDARY_ROW_COUNT = 4;
/** Parsed row count of {@link GIS_WAVE_B_POINTS_CSV_PATH}. */
export const GIS_WAVE_B_POINT_ROW_COUNT = 8;
/** Parsed row count of {@link GIS_WAVE_B_SUMMARY_CSV_PATH}. */
export const GIS_WAVE_B_SUMMARY_ROW_COUNT = 7;

const GIS_WAVE_C_DATA_DIR = path.join(process.cwd(), "tests/data/gis-wave-c");

/**
 * Points with two tight groups a degree apart, so a fitted map clusters each
 * group into a single symbol. `cases` is the first numeric column, so a
 * graduated classification defaults to it, and `population` is a second
 * numeric column available as a normalization denominator.
 */
export const GIS_WAVE_C_POINTS_CSV_PATH = path.join(
  GIS_WAVE_C_DATA_DIR,
  "gis-wave-c-points.csv",
);

/** Two valid rows plus two whose latitude only fits as a longitude. */
export const GIS_WAVE_C_SWAPPED_POINTS_CSV_PATH = path.join(
  GIS_WAVE_C_DATA_DIR,
  "gis-wave-c-swapped-points.csv",
);

/**
 * Four points sharing one coordinate and one point a degree away, so any
 * fixed-meter grid puts them in exactly two cells with counts four and one.
 */
export const GIS_WAVE_C_BIN_POINTS_CSV_PATH = path.join(
  GIS_WAVE_C_DATA_DIR,
  "gis-wave-c-bin-points.csv",
);

/** Point WKT in EPSG:3857 whose WGS 84 equivalents sit near 10E 10N. */
export const GIS_WAVE_C_WEB_MERCATOR_CSV_PATH = path.join(
  GIS_WAVE_C_DATA_DIR,
  "gis-wave-c-web-mercator.csv",
);

/** Parsed row count of {@link GIS_WAVE_C_POINTS_CSV_PATH}. */
export const GIS_WAVE_C_POINT_ROW_COUNT = 8;
/** Parsed row count of {@link GIS_WAVE_C_SWAPPED_POINTS_CSV_PATH}. */
export const GIS_WAVE_C_SWAPPED_POINT_ROW_COUNT = 4;
/** Parsed row count of {@link GIS_WAVE_C_BIN_POINTS_CSV_PATH}. */
export const GIS_WAVE_C_BIN_POINT_ROW_COUNT = 5;
/** Parsed row count of {@link GIS_WAVE_C_WEB_MERCATOR_CSV_PATH}. */
export const GIS_WAVE_C_WEB_MERCATOR_ROW_COUNT = 3;

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
