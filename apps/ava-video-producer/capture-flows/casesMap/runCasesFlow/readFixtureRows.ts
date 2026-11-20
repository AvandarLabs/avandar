import { readFile } from "node:fs/promises";
import path from "node:path";
import type { FlowContext } from "../../captureFlows.types";
import type { FixtureRow } from "./runCasesFlow.types";

/**
 * Reads a generated fixture CSV into rows keyed by column name, so the cases
 * flow can compare what the product shows against what was imported.
 *
 * Called by `runCasesFlow` for the cases and visits fixtures.
 */
export async function readFixtureRows(
  context: Readonly<FlowContext>,
  key: string,
): Promise<FixtureRow[]> {
  const csv = await readFile(
    path.join(context.fixtureDir, `${key}.csv`),
    "utf8",
  );
  // These two generated fixtures contain no quoted fields or embedded
  // delimiters.
  if (csv.includes('"')) {
    throw new Error(
      `Update the fixture reader for quoted fields in ${key}.csv.`,
    );
  }
  const [header, ...rows] = csv
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      return line.split(",");
    });
  return rows.map((values) => {
    return Object.fromEntries(
      header.map((column, index) => {
        return [column, values[index]];
      }),
    );
  });
}
