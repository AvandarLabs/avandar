/** Pins needed-column attribution from SQL and from concept plans. */

import { describe, expect, it } from "vitest";
import { getNeededColumnsFromQuery } from "@/clients/qetl/QueryMediator/getNeededColumnsFromQuery/getNeededColumnsFromQuery";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptRelationPlan } from "@/clients/qetl/QueryMediator/conceptRelation/conceptRelation.types";

const DATASET_ID = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa" as Dataset.Id;
const CONCEPT_ID = "cccccccc-3333-4333-8333-cccccccccccc" as Concept.Id;

const CONCEPT_PLAN: ConceptRelationPlan = {
  ref: { kind: "concept", id: CONCEPT_ID },
  contributingDatasetIds: [DATASET_ID],
  externalIds: ["p1"],
  attributeColumns: [
    {
      kind: "dataset_column",
      attributeName: "age",
      selectColumnName: "age_years",
      datasetId: DATASET_ID,
      primaryKeyColumnName: "person_id",
      valuePickerRuleType: "first",
      isArray: false,
    },
  ],
};

describe("getNeededColumnsFromQuery", () => {
  it("takes identifier plus attribute columns from a concept plan even when the SQL names no dataset", () => {
    expect(
      getNeededColumnsFromQuery({
        rawSql: `SELECT * FROM "concept_${CONCEPT_ID}"`,
        datasetIds: [DATASET_ID],
        conceptRelations: [CONCEPT_PLAN],
      }),
    ).toEqual({ [DATASET_ID]: ["age_years", "person_id"] });
  });

  it("reads an explicit select list from a single-dataset query", () => {
    expect(
      getNeededColumnsFromQuery({
        rawSql: `SELECT "status", "case_id" FROM "${DATASET_ID}"`,
        datasetIds: [DATASET_ID],
        conceptRelations: [],
      }),
    ).toEqual({ [DATASET_ID]: ["case_id", "status"] });
  });

  it("fails wide to 'all' for SELECT *", () => {
    expect(
      getNeededColumnsFromQuery({
        rawSql: `SELECT * FROM "${DATASET_ID}"`,
        datasetIds: [DATASET_ID],
        conceptRelations: [],
      }),
    ).toEqual({ [DATASET_ID]: "all" });
  });

  it("fails wide to 'all' when the SQL is not a readable statement", () => {
    expect(
      getNeededColumnsFromQuery({
        rawSql: "not sql",
        datasetIds: [DATASET_ID],
        conceptRelations: [],
      }),
    ).toEqual({ [DATASET_ID]: "all" });
  });

  it("unions SQL columns with concept columns for the same dataset", () => {
    expect(
      getNeededColumnsFromQuery({
        rawSql: `SELECT "status" FROM "${DATASET_ID}"`,
        datasetIds: [DATASET_ID],
        conceptRelations: [CONCEPT_PLAN],
      })[DATASET_ID],
    ).toEqual(["age_years", "person_id", "status"]);
  });

  it("reads past a cast's type name rather than treating it as a column", () => {
    // `DOUBLE` sits where a column sits: an unquoted identifier that is not a
    // function call and is not preceded by `AS`. Requesting it projected a
    // column the Parquet does not have, which failed the whole query with a
    // binder error rather than merely widening the fetch.
    expect(
      getNeededColumnsFromQuery({
        rawSql: `SELECT SUM("cases")::DOUBLE AS total FROM "${DATASET_ID}"`,
        datasetIds: [DATASET_ID],
        conceptRelations: [],
      }),
    ).toEqual({ [DATASET_ID]: ["cases"] });
  });

  it("resolves an ORDER BY name to a select-list alias, not to a column", () => {
    expect(
      getNeededColumnsFromQuery({
        rawSql:
          `SELECT "Admin2", SUM("daily_new_cases")::DOUBLE AS total_cases ` +
          `FROM "${DATASET_ID}" GROUP BY "Admin2" ORDER BY total_cases DESC`,
        datasetIds: [DATASET_ID],
        conceptRelations: [],
      }),
    ).toEqual({ [DATASET_ID]: ["Admin2", "daily_new_cases"] });
  });

  it("keeps a name that is both an alias and a real column reference", () => {
    // The alias shadows a real column of the same name. The bare reference
    // inside `SUM(...)` is the column, so dropping the name on sight would
    // under-project and break the query.
    expect(
      getNeededColumnsFromQuery({
        rawSql:
          `SELECT SUM("cases") AS "cases" FROM "${DATASET_ID}" ` +
          `ORDER BY "cases" DESC`,
        datasetIds: [DATASET_ID],
        conceptRelations: [],
      }),
    ).toEqual({ [DATASET_ID]: ["cases"] });
  });

  it("fails wide when an alias is referenced outside ORDER BY", () => {
    // HAVING resolves aliases in DuckDB but not in every dialect this SQL can
    // be written against, so the name is genuinely ambiguous here. Widening
    // costs bytes; guessing wrong costs the query.
    expect(
      getNeededColumnsFromQuery({
        rawSql:
          `SELECT "a", SUM("b") AS total FROM "${DATASET_ID}" ` +
          `GROUP BY "a" HAVING total > 5`,
        datasetIds: [DATASET_ID],
        conceptRelations: [],
      }),
    ).toEqual({ [DATASET_ID]: "all" });
  });
});
