import path from "node:path";
import {
  E2E_PRIMARY_USER_EMAIL,
  E2E_PRIMARY_USER_PASSWORD,
  E2E_SEEDED_WORKSPACE_SLUG,
} from "../setup/e2e-credentials";

export const E2E_TEST_USER = {
  email: E2E_PRIMARY_USER_EMAIL,
  password: E2E_PRIMARY_USER_PASSWORD,
} as const;

export { E2E_SEEDED_WORKSPACE_SLUG };

/** Navbar workspace menu button shows the workspace display name. */
export const SEEDED_WORKSPACE_MENU_BUTTON_NAME = /Avandar Labs/i;

/**
 * Row count reported after DuckDB parses `california-covid-sample.csv`
 * (matches UI; differs from `wc -l` minus header due to loader semantics).
 */
export const CALIFORNIA_CSV_EXPECTED_ROW_COUNT = 14700;

export const CALIFORNIA_CSV_PATH = path.join(
  process.cwd(),
  "tests/data/california-covid-sample.csv",
);

export const EXPECTED_CSV_COLUMN_NAMES = [
  "Province_State",
  "Admin2",
  "Lat",
  "Long_",
  "date",
  "daily_new_cases",
] as const;
