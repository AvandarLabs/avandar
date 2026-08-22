/** Pins needed-column attribution from SQL and from concept plans. */

import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ConceptRelationPlan } from "@/clients/qetl/QueryMediator/conceptRelation/conceptRelation.types";

import { describe, expect, it } from "vitest";

import { getNeededColumnsFromQuery } from "@/clients/qetl/QueryMediator/getNeededColumnsFromQuery/getNeededColumnsFromQuery";

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
});
