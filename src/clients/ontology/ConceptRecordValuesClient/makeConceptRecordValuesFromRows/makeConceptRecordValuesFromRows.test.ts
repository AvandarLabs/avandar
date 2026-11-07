import { describe, expect, it } from "vitest";
import { makeConceptRecordValuesFromRows } from "@/clients/ontology/ConceptRecordValuesClient/makeConceptRecordValuesFromRows/makeConceptRecordValuesFromRows";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { ConceptAttributeColumn } from "@/clients/qetl/QueryMediator/conceptRelation/buildConceptViewSql/buildConceptViewSql";

const AGE_ID = "attr-age" as ConceptAttribute.Id;
const SECOND_AGE_ID = "attr-age-2" as ConceptAttribute.Id;

/** Two attributes named `age`. The view emits the second as `age_2`. */
const COLUMNS: ConceptAttributeColumn[] = [
  {
    kind: "unmapped",
    attributeId: AGE_ID,
    attributeName: "age",
    duckDbDataType: "BIGINT",
  },
  {
    kind: "unmapped",
    attributeId: SECOND_AGE_ID,
    attributeName: "age_2",
    duckDbDataType: "BIGINT",
  },
];

describe("makeConceptRecordValuesFromRows", () => {
  it("keys each value by its attribute's id when two attributes share a name", () => {
    const records = makeConceptRecordValuesFromRows({
      rows: [{ external_id: "p1", status: "Active", age: 41, age_2: 7 }],
      attributeColumns: COLUMNS,
      externalIds: ["p1"],
    });

    expect(records).toEqual([
      {
        externalId: "p1",
        valuesByAttributeId: { [AGE_ID]: 41, [SECOND_AGE_ID]: 7 },
      },
    ]);
  });

  it("returns records in the requested order", () => {
    const records = makeConceptRecordValuesFromRows({
      rows: [
        { external_id: "p1", status: "Active", age: 41, age_2: 7 },
        { external_id: "p2", status: "Active", age: 50, age_2: 8 },
      ],
      attributeColumns: COLUMNS,
      externalIds: ["p2", "p1"],
    });

    expect(
      records.map((record) => {
        return record.externalId;
      }),
    ).toEqual(["p2", "p1"]);
  });

  it("leaves out a key that names no record", () => {
    const records = makeConceptRecordValuesFromRows({
      rows: [{ external_id: "p1", status: "Active", age: 41, age_2: 7 }],
      attributeColumns: COLUMNS,
      externalIds: ["missing", "p1"],
    });

    expect(
      records.map((record) => {
        return record.externalId;
      }),
    ).toEqual(["p1"]);
  });

  it("does not read an attribute from the row's prototype", () => {
    const records = makeConceptRecordValuesFromRows({
      rows: [{ external_id: "p1", status: "Active" }],
      attributeColumns: [
        {
          kind: "unmapped",
          attributeId: AGE_ID,
          attributeName: "constructor",
          duckDbDataType: "BIGINT",
        },
      ],
      externalIds: ["p1"],
    });

    expect(records[0]?.valuesByAttributeId).toEqual({});
  });

  it("leaves out an attribute whose column the row does not have", () => {
    const records = makeConceptRecordValuesFromRows({
      rows: [{ external_id: "p1", status: "Active", age: 41 }],
      attributeColumns: COLUMNS,
      externalIds: ["p1"],
    });

    expect(records[0]?.valuesByAttributeId).toEqual({ [AGE_ID]: 41 });
  });
});
