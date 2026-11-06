import fixtures from "./fixtures.json";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { SqlDisplayCatalog } from "@/components/sql/sql-helpers/sqlDisplay.types";

/** Stable fictional identity used only by the deterministic demo data binding. */
export const EXPLORER_CASES_DATASET_ID = "00000000-0000-4000-8000-000000000240";
export const EXPLORER_CASES_DATASET_NAME = "Video - Harborfield cases";

/** All records come from the validated cases.csv fixture, in its source order. */
export const EXPLORER_CASES = fixtures.cases as Array<
  Record<string, string | number | null>
>;
export const EXPLORER_COLUMN_NAMES = Object.keys(EXPLORER_CASES[0]!);
export const EXPLORER_DISPLAY_COLUMNS = [
  "case_id",
  "case_label",
  "district_name",
  "report_date",
  "support_need",
  "referral_status",
];

/** Local metadata replacing dataset-column fetching, without changing the product controls. */
export const EXPLORER_COLUMNS = EXPLORER_COLUMN_NAMES.map((name, index) => {
  const dataType = ["latitude", "longitude"].includes(name)
    ? "double"
    : name === "household_size"
      ? "bigint"
      : ["report_date", "week_start"].includes(name)
        ? "date"
        : "varchar";
  return {
    __type: "QueryColumn",
    id: `00000000-0000-4000-9000-${String(index + 1).padStart(12, "0")}`,
    aggregation: undefined,
    baseColumn: {
      __type: "DatasetColumn",
      id: `00000000-0000-4000-a000-${String(index + 1).padStart(12, "0")}`,
      datasetId: EXPLORER_CASES_DATASET_ID,
      workspaceId: "00000000-0000-4000-8000-000000000001",
      name,
      originalName: name,
      dataType,
      originalDataType: dataType,
      detectedDataType: dataType.toUpperCase(),
      columnIdx: index,
      createdAt: "2026-09-13T00:00:00Z",
      updatedAt: "2026-09-13T00:00:00Z",
      description: undefined,
    },
  };
}) as unknown as QueryColumn.T[];

export const EXPLORER_SELECTED_COLUMNS = EXPLORER_DISPLAY_COLUMNS.map((name) =>
  EXPLORER_COLUMNS.find((column) => column.baseColumn.name === name)!,
);

/** The same GROUP BY and ORDER BY as the authored SQL below. */
export const EXPLORER_DISTRICT_COUNTS = Object.entries(
  EXPLORER_CASES.reduce<Record<string, number>>((counts, row) => {
    const name = String(row.district_name);
    counts[name] = (counts[name] ?? 0) + 1;
    return counts;
  }, {}),
)
  .map(([district_name, recorded_cases]) => ({ district_name, recorded_cases }))
  .sort(
    (left, right) =>
      right.recorded_cases - left.recorded_cases ||
      left.district_name.localeCompare(right.district_name),
  );

/** The single fixture dataset and its columns, in the shape the SQL editor's autocomplete expects. */
export const EXPLORER_SQL_CATALOG = {
  datasets: [
    {
      id: EXPLORER_CASES_DATASET_ID,
      name: EXPLORER_CASES_DATASET_NAME,
      columns: EXPLORER_COLUMN_NAMES.map((name) => ({ name })),
    },
  ],
} as unknown as SqlDisplayCatalog;

/** The authored SQL behind the district-count chart, matching `EXPLORER_DISTRICT_COUNTS`. */
export const EXPLORER_AGGREGATE_SQL = `SELECT district_name, COUNT(*) AS recorded_cases\nFROM "${EXPLORER_CASES_DATASET_ID}"\nGROUP BY district_name\nORDER BY recorded_cases DESC;`;

/** The authored SQL behind the Eastbank-filtered case list. */
export const EXPLORER_FILTER_SQL = `SELECT case_id, case_label, district_name,\n       report_date, support_need, referral_status\nFROM "${EXPLORER_CASES_DATASET_ID}"\nWHERE district_name = 'Eastbank';`;
