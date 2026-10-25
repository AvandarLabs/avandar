import type { NodeDuckDb } from "@avandar/etl";

/** The first and last calendar year a WDI table covers. */
export type WdiYearCoverage = Readonly<{ minYear: number; maxYear: number }>;

/**
 * Reads the first and last calendar year a WDI CSV covers, from its `Year`
 * column. Handles plain years and World Bank codes such as `YR1960`.
 *
 * @returns The coverage, or `undefined` when the CSV has no `Year` column or
 * no parseable year.
 */
export async function getWdiYearCoverageFromCsv(args: {
  db: NodeDuckDb;
  csvPath: string;
  columnNames: readonly string[];
}): Promise<WdiYearCoverage | undefined> {
  const yearColumn = args.columnNames.find((name) => {
    return name.toLowerCase() === "year";
  });
  if (yearColumn === undefined) {
    return undefined;
  }
  const pathLiteral = args.csvPath.replace(/'/g, "''");
  const yearIdentifier = `"${yearColumn.replace(/"/g, '""')}"`;
  const yearDigits = `TRY_CAST(regexp_extract(CAST(${yearIdentifier} AS VARCHAR), '([0-9]{4})', 1) AS BIGINT)`;
  const rows = await args.db.runRawQuery<{
    min_y: bigint | number | null;
    max_y: bigint | number | null;
  }>(
    `SELECT MIN(${yearDigits}) AS min_y, MAX(${yearDigits}) AS max_y
      FROM read_csv('${pathLiteral}', header = true, all_varchar = true)`,
  );
  const row = rows[0];
  if (!row || row.min_y === null || row.max_y === null) {
    return undefined;
  }
  return { minYear: Number(row.min_y), maxYear: Number(row.max_y) };
}
