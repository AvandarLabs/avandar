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
  ])("%s counts %i cases", async (questionId, expectedCount) => {
    const question = MEASLES_QUESTIONS.find((candidate) => {
      return candidate.id === questionId;
    });
    const result = await database!.query(question!.truth.count!);
    expect(result.rows).toEqual([[expectedCount]]);
  });
});
