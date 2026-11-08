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
const FIELD_A_ID = "11111111-1111-4111-8111-111111111111";
const FIELD_B_ID = "22222222-2222-4222-8222-222222222222";

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

  it("marks a field that keeps every value as a list", () => {
    const aliases = SqlTableAlias.fromConcepts([
      { id: CONCEPT_B.id, name: "Measles case" },
    ]);
    const block = SqlTableAlias.formatSchemaBlock({
      aliases,
      columns: [],
      conceptAttributes: [
        { concept_id: CONCEPT_B.id, name: "age" },
        { concept_id: CONCEPT_B.id, name: "Symptoms", is_array: true },
      ],
    });

    expect(block).toBe("- c0: Measles case (age, Symptoms (list))");
  });

  it("lists a field named like the record key under its suffixed column", () => {
    const aliases = SqlTableAlias.fromConcepts([CONCEPT_B]);
    const block = SqlTableAlias.formatSchemaBlock({
      aliases,
      columns: [],
      conceptAttributes: [
        { id: FIELD_A_ID, concept_id: CONCEPT_B.id, name: "external_id" },
        { id: FIELD_B_ID, concept_id: CONCEPT_B.id, name: "district" },
      ],
    });

    expect(block).toBe(
      '- c0: Case (external_id_2 (field "external_id"), district)',
    );
  });

  it("lists two fields whose names differ only by case under distinct columns", () => {
    const aliases = SqlTableAlias.fromConcepts([CONCEPT_B]);
    const block = SqlTableAlias.formatSchemaBlock({
      aliases,
      columns: [],
      conceptAttributes: [
        { id: FIELD_A_ID, concept_id: CONCEPT_B.id, name: "Age" },
        { id: FIELD_B_ID, concept_id: CONCEPT_B.id, name: "age" },
      ],
    });

    expect(block).toBe('- c0: Case (Age_2 (field "Age"), age)');
  });

  it("keeps the list marker on a field listed under a suffixed column", () => {
    const aliases = SqlTableAlias.fromConcepts([CONCEPT_B]);
    const block = SqlTableAlias.formatSchemaBlock({
      aliases,
      columns: [],
      conceptAttributes: [
        {
          id: FIELD_A_ID,
          concept_id: CONCEPT_B.id,
          name: "external_id",
          is_array: true,
        },
        {
          id: FIELD_B_ID,
          concept_id: CONCEPT_B.id,
          name: "Symptoms",
          is_array: true,
        },
      ],
    });

    expect(block).toBe(
      '- c0: Case (external_id_2 (list, field "external_id"), Symptoms (list))',
    );
  });

  it("lists the bare name for a field cached without an id", () => {
    const aliases = SqlTableAlias.fromConcepts([CONCEPT_B]);
    const block = SqlTableAlias.formatSchemaBlock({
      aliases,
      columns: [],
      conceptAttributes: [{ concept_id: CONCEPT_B.id, name: "external_id" }],
    });

    expect(block).toBe("- c0: Case (external_id)");
  });

  it("lists a case type's statuses in position order after its attributes", () => {
    const aliases = SqlTableAlias.fromConcepts([
      { id: CONCEPT_B.id, name: "Cholera case" },
    ]);
    const block = SqlTableAlias.formatSchemaBlock({
      aliases,
      columns: [],
      conceptAttributes: [
        { concept_id: CONCEPT_B.id, name: "age" },
        { concept_id: CONCEPT_B.id, name: "district" },
      ],
      conceptStatuses: [
        { concept_id: CONCEPT_B.id, name: "Ruled out", position: 2 },
        { concept_id: CONCEPT_B.id, name: "Suspected", position: 0 },
        { concept_id: CONCEPT_B.id, name: "Confirmed", position: 1 },
      ],
    });

    expect(block).toBe(
      "- c0: Cholera case (age, district, status: Suspected | Confirmed | Ruled out)",
    );
  });

  it("lists the status field alone for a case type with no attributes", () => {
    const aliases = SqlTableAlias.fromConcepts([CONCEPT_B]);
    const block = SqlTableAlias.formatSchemaBlock({
      aliases,
      columns: [],
      conceptStatuses: [
        { concept_id: CONCEPT_B.id, name: "Active", position: 0 },
        { concept_id: CONCEPT_B.id, name: "Inactive", position: 1 },
      ],
    });

    expect(block).toBe("- c0: Case (status: Active | Inactive)");
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

describe("SqlTableAlias.formatListFieldNote", () => {
  it("explains list SQL only when a field is a list", () => {
    expect(
      SqlTableAlias.formatListFieldNote([
        { concept_id: CONCEPT_B.id, name: "Symptoms", is_array: true },
      ]),
    ).toContain("list_contains(\"field\", 'value')");
    expect(
      SqlTableAlias.formatListFieldNote([
        { concept_id: CONCEPT_B.id, name: "age" },
      ]),
    ).toBe("");
  });
});
