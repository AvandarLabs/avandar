import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { EvalDatabase } from "../runtime/EvalDatabase";
import { MEASLES_QUESTIONS } from "./measlesQuestions";
import { MEASLES_DATASETS } from "./measlesWorkspace";

const DATA_DIR = resolve(
  import.meta.dirname,
  "../../../tests/data/measles-line-list-small",
);

describe("the measles truth counts", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "measles-eval-"));
  let database: EvalDatabase | undefined;

  beforeAll(async () => {
    database = await EvalDatabase.open({
      databasePath: join(tempDir, "measles.duckdb"),
      dataDir: DATA_DIR,
      datasets: MEASLES_DATASETS,
    });
  });

  afterAll(() => {
    database?.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it.each([
    ["D01", 1],
    ["D02", 11],
    ["D03", 3],
    ["E01", 1],
    ["E02", 10],
    ["E03", 8],
  ])("%s counts %i cases", async (questionId, expectedCount) => {
    const question = MEASLES_QUESTIONS.find((candidate) => {
      return candidate.id === questionId;
    });
    const result = await database!.query(question!.truth.count!);
    expect(result.rows).toEqual([[expectedCount]]);
  });

  it("converts the labeled line list with the app's own SQL", async () => {
    const genders = await database!.query(
      `SELECT DISTINCT "GENDER" FROM labeled_line_list ORDER BY 1`,
    );
    // 9 has no label, so the conversion passes it through.
    expect(genders.rows).toEqual([["9"], ["Female"], ["Male"]]);
  });

  it("orders the converted ordered list by the list, not the alphabet", async () => {
    const levels = await database!.query(
      `SELECT "ses_cat" FROM labeled_line_list GROUP BY 1 ORDER BY 1`,
    );
    expect(levels.rows).toEqual([
      ["Low"],
      ["Lower-middle"],
      ["Upper-middle"],
      ["High"],
    ]);
  });

  it("counts the same cases in labels as in codes", async () => {
    const coded = await database!.query(
      `SELECT count(*) FROM line_list WHERE "ses_cat" IN (3, 4)`,
    );
    const labeled = await database!.query(
      `SELECT count(*) FROM labeled_line_list WHERE "ses_cat" IN ('Upper-middle', 'High')`,
    );
    expect(labeled.rows).toEqual(coded.rows);
  });
});
