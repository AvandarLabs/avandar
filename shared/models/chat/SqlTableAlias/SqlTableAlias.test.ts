import { describe, expect, it } from "vitest";

/**
 * SqlTableAlias assigns workspace-scoped short names and formats the
 * model-facing schema block. DuckDB still uses dataset UUIDs and
 * concept_<uuid> table names; aliases never appear there.
 */
import { SqlTableAlias } from "$/models/chat/SqlTableAlias/SqlTableAlias.ts";

const DATASET_A = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  name: "Cases",
};
const DATASET_B = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  name: "Cholera cases",
};
const CONCEPT_A = {
  id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  name: "Household",
};
const CONCEPT_B = {
  id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  name: "Case",
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

  it("does not treat a concept alias as a dataset id", () => {
    const aliases = SqlTableAlias.fromSchema({
      datasets: [DATASET_B],
      concepts: [CONCEPT_B],
    });
    expect(SqlTableAlias.getDatasetIdFromAlias("c0", aliases)).toBeUndefined();
  });
});

describe("SqlTableAlias.fromConcepts", () => {
  it("assigns cN by concept id so input order does not change aliases", () => {
    const forward = SqlTableAlias.fromConcepts([CONCEPT_A, CONCEPT_B]);
    const reverse = SqlTableAlias.fromConcepts([CONCEPT_B, CONCEPT_A]);

    expect(forward).toEqual(reverse);
    expect(forward[0]).toMatchObject({
      kind: "concept",
      alias: "c0",
      conceptId: CONCEPT_B.id,
      name: "Case",
    });
    expect(forward[1]).toMatchObject({
      kind: "concept",
      alias: "c1",
      conceptId: CONCEPT_A.id,
      name: "Household",
    });
  });
});

describe("SqlTableAlias.fromSchema", () => {
  it("lists dataset aliases then concept aliases", () => {
    const aliases = SqlTableAlias.fromSchema({
      datasets: [DATASET_B],
      concepts: [CONCEPT_B],
    });
    expect(
      aliases.map((entry) => {
        return entry.alias;
      }),
    ).toEqual(["t0", "c0"]);
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

  it("lists concept attribute names without concept UUIDs", () => {
    const aliases = SqlTableAlias.fromConcepts([CONCEPT_B]);
    const block = SqlTableAlias.formatSchemaBlock({
      aliases,
      columns: [],
      conceptAttributes: [
        { concept_id: CONCEPT_B.id, name: "onset_date" },
        { concept_id: CONCEPT_B.id, name: "status" },
      ],
    });

    expect(block).toContain("- c0: Case (onset_date, status)");
    expect(block).not.toContain(CONCEPT_B.id);
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

  it("rewrites concept aliases to concept table names", () => {
    const aliases = SqlTableAlias.fromConcepts([CONCEPT_B]);
    const sql = SqlTableAlias.applyToSql('SELECT c0.status FROM "c0"', aliases);

    expect(sql).toBe(
      `SELECT "concept_${CONCEPT_B.id}".status FROM "concept_${CONCEPT_B.id}"`,
    );
  });

  it("rewrites c10 before c1 so shorter aliases cannot steal a prefix", () => {
    const concepts = Array.from({ length: 11 }, (_, index) => {
      const suffix = String(index).padStart(12, "0");
      return {
        id: `cccccccc-cccc-4ccc-8ccc-${suffix}`,
        name: `Concept ${index}`,
      };
    });
    const sorted = [...concepts].sort((left, right) => {
      return left.id.localeCompare(right.id);
    });
    const aliases = SqlTableAlias.fromConcepts(concepts);
    const sql = SqlTableAlias.applyToSql('SELECT 1 FROM "c10"', aliases);

    expect(sql).toBe(`SELECT 1 FROM "concept_${sorted[10]!.id}"`);
    expect(sql).not.toContain(`concept_${sorted[1]!.id}`);
  });
});
