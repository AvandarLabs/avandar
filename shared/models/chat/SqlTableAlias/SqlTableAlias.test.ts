/**
 * SqlTableAlias assigns workspace-scoped short names and formats the
 * model-facing schema block. DuckDB still uses dataset UUIDs; aliases never
 * appear there.
 */
import { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias.ts";
import { describe, expect, it } from "vitest";

const DATASET_A = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  name: "Cases",
};
const DATASET_B = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  name: "Cholera cases",
};

describe("SqlTableAlias.fromDatasets", () => {
  it("assigns tN by dataset id so input order does not change aliases", () => {
    const forward = SqlTableAlias.fromDatasets([DATASET_A, DATASET_B]);
    const reverse = SqlTableAlias.fromDatasets([DATASET_B, DATASET_A]);

    expect(forward).toEqual(reverse);
    expect(SqlTableAlias.getDatasetIdFromAlias("t0", forward)).toBe(
      DATASET_B.id,
    );
    expect(SqlTableAlias.getDatasetIdFromAlias("t1", forward)).toBe(
      DATASET_A.id,
    );
  });

  it("returns undefined for an alias that is not in the map", () => {
    const aliases = SqlTableAlias.fromDatasets([DATASET_B]);
    expect(SqlTableAlias.getDatasetIdFromAlias("t9", aliases)).toBeUndefined();
    expect(SqlTableAlias.getDatasetIdFromAlias("t0", aliases)).toBe(
      DATASET_B.id,
    );
  });
});

describe("SqlTableAlias.formatSchemaBlock", () => {
  it("lists alias, label, and columns without dataset UUIDs", () => {
    const aliases = SqlTableAlias.fromDatasets([DATASET_B]);
    const block = SqlTableAlias.formatSchemaBlock({
      aliases,
      columns: [
        {
          dataset_id: DATASET_B.id,
          name: "case_id",
          data_type: "string",
        },
        {
          dataset_id: DATASET_B.id,
          name: "onset_date",
          data_type: "date",
        },
      ],
    });

    expect(block).toContain("- t0: Cholera cases (case_id, onset_date)");
    expect(block).not.toContain(DATASET_B.id);
  });
});

describe("SqlTableAlias.applyToSql", () => {
  it("rewrites FROM/JOIN aliases and qualified names to dataset ids", () => {
    const aliases = SqlTableAlias.fromDatasets([DATASET_B, DATASET_A]);
    const sql = SqlTableAlias.applyToSql(
      'SELECT t0.case_id FROM "t0" JOIN t1 ON t0.id = t1.id',
      aliases,
    );

    expect(sql).toBe(
      `SELECT "${DATASET_B.id}".case_id FROM "${DATASET_B.id}" JOIN "${DATASET_A.id}" ON "${DATASET_B.id}".id = "${DATASET_A.id}".id`,
    );
  });
});
