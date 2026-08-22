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

/**
 * Real 10-page tagged PDF (see `public/test-data/pdf/README.md` for its
 * provenance and licence). Well under the 50-page import cap, so its page
 * geometry sniff finishes quickly.
 */
export const FRONTIERS_PERU_PDF_PATH = path.join(
  process.cwd(),
  "public/test-data/pdf/frontiers-peru-child-health-insurance.pdf",
);

/**
 * The OCHA Sudan Cholera Operational Update of 3 July 2025: page 1 carries the
 * choropleth this suite extracts, and the whole document is 3 pages.
 *
 * This is one of the two merge-gate documents (see
 * `src/workers/pdfSniff/gateDocuments.test.ts`), and the only one that is
 * committed. The IMC situation report has no confirmed redistribution licence,
 * so it is gitignored and may be absent, which makes it unusable here.
 */
export const OCHA_SUDAN_CHOLERA_PDF_PATH = path.join(
  process.cwd(),
  "public/test-data/pdf/gate/ocha-sudan-cholera-update-2025-07-03.pdf",
);

/** Page 1 of {@link OCHA_SUDAN_CHOLERA_PDF_PATH}, in PDF points. */
export const OCHA_SUDAN_CHOLERA_PAGE_SIZE_PT = {
  width: 595.276,
  height: 841.89,
} as const;

/** Directory of GIS geometry, boundary, and point CSV fixtures. */
const GIS_DATA_DIR = path.join(process.cwd(), "tests/data/gis");

/** Point, line, and polygon rows in WKT, WKB, and GeoJSON columns. */
export const GIS_GEOMETRY_FORMATS_CSV_PATH = path.join(
  GIS_DATA_DIR,
  "geometry-formats.csv",
);
/** Adjacent square polygons with code, name, and population. */
export const GIS_BOUNDARY_POLYGONS_CSV_PATH = path.join(
  GIS_DATA_DIR,
  "boundary-polygons.csv",
);
/** Lat/lng points with a numeric value column. */
export const GIS_LAT_LNG_POINTS_CSV_PATH = path.join(
  GIS_DATA_DIR,
  "lat-lng-points.csv",
);
/** Pre-aggregated boundary-key summary values. */
export const GIS_BOUNDARY_SUMMARY_CSV_PATH = path.join(
  GIS_DATA_DIR,
  "boundary-summary.csv",
);

/** Parsed row count of {@link GIS_GEOMETRY_FORMATS_CSV_PATH}. */
export const GIS_GEOMETRY_FORMATS_ROW_COUNT = 4;
/** Parsed row count of {@link GIS_BOUNDARY_POLYGONS_CSV_PATH}. */
export const GIS_BOUNDARY_POLYGONS_ROW_COUNT = 4;
/** Parsed row count of {@link GIS_LAT_LNG_POINTS_CSV_PATH}. */
export const GIS_LAT_LNG_POINTS_ROW_COUNT = 8;
/** Parsed row count of {@link GIS_BOUNDARY_SUMMARY_CSV_PATH}. */
export const GIS_BOUNDARY_SUMMARY_ROW_COUNT = 7;

/**
 * Points with two tight groups a degree apart, so a fitted map clusters each
 * group into a single symbol. `cases` is the first numeric column, so a
 * graduated classification defaults to it, and `population` is a second
 * numeric column available as a normalization denominator.
 */
export const GIS_CLUSTER_POINTS_CSV_PATH = path.join(
  GIS_DATA_DIR,
  "cluster-points.csv",
);

/** Two valid rows plus two whose latitude only fits as a longitude. */
export const GIS_SWAPPED_LAT_LNG_POINTS_CSV_PATH = path.join(
  GIS_DATA_DIR,
  "swapped-lat-lng-points.csv",
);

/**
 * Four points sharing one coordinate and one point a degree away, so any
 * fixed-meter grid puts them in exactly two cells with counts four and one.
 */
export const GIS_GRID_BIN_POINTS_CSV_PATH = path.join(
  GIS_DATA_DIR,
  "grid-bin-points.csv",
);

/** Point WKT in EPSG:3857 whose WGS 84 equivalents sit near 10E 10N. */
export const GIS_WEB_MERCATOR_POINTS_CSV_PATH = path.join(
  GIS_DATA_DIR,
  "web-mercator-points.csv",
);

/** Parsed row count of {@link GIS_CLUSTER_POINTS_CSV_PATH}. */
export const GIS_CLUSTER_POINTS_ROW_COUNT = 8;
/** Parsed row count of {@link GIS_SWAPPED_LAT_LNG_POINTS_CSV_PATH}. */
export const GIS_SWAPPED_LAT_LNG_POINTS_ROW_COUNT = 4;
/** Parsed row count of {@link GIS_GRID_BIN_POINTS_CSV_PATH}. */
export const GIS_GRID_BIN_POINTS_ROW_COUNT = 5;
/** Parsed row count of {@link GIS_WEB_MERCATOR_POINTS_CSV_PATH}. */
export const GIS_WEB_MERCATOR_POINTS_ROW_COUNT = 3;

/**
 * Dated points clustered near 10E 10N, plus one later-week outlier at 11E 10N.
 * `observed_at` is the map time column; `cases` is unused numeric payload.
 */
export const GIS_DATED_POINTS_CSV_PATH = path.join(
  GIS_DATA_DIR,
  "dated-points.csv",
);

/** One P-code polygon covering 10E 10N for buffer and go-to flows. */
export const GIS_PCODE_POLYGON_CSV_PATH = path.join(
  GIS_DATA_DIR,
  "pcode-polygon.csv",
);

/** Parsed row count of {@link GIS_DATED_POINTS_CSV_PATH}. */
export const GIS_DATED_POINTS_ROW_COUNT = 9;
/** Parsed row count of {@link GIS_PCODE_POLYGON_CSV_PATH}. */
export const GIS_PCODE_POLYGON_ROW_COUNT = 1;

/** Directory of Wave E export/disputed-boundary GIS fixtures. */
const GIS_WAVE_E_DATA_DIR = path.join(process.cwd(), "tests/data/gis-wave-e");

/**
 * Four adjacent polygons: two `status = Agreed`, one `Disputed`, one
 * `Undetermined`, each a GeoJSON polygon string near 10E-12E, 10N-12N.
 */
export const GIS_DISPUTED_BOUNDARIES_CSV_PATH = path.join(
  GIS_WAVE_E_DATA_DIR,
  "disputed-boundaries.csv",
);

/** Parsed row count of {@link GIS_DISPUTED_BOUNDARIES_CSV_PATH}. */
export const GIS_DISPUTED_BOUNDARIES_ROW_COUNT = 4;

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
