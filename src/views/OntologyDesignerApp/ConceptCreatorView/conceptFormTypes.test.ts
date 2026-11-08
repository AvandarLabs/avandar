import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import {
  getDefaultConceptFormValues,
  makeDefaultDatasetColumnAttribute,
  withDefaultValueRule,
  withFieldDataTypes,
} from "./conceptFormTypes";
import type {
  DatasetId,
  DatasetWithColumns,
} from "$/models/datasets/Dataset/Dataset.types";
import type {
  DatasetColumnId,
  DatasetColumnRead,
} from "$/models/datasets/DatasetColumn/DatasetColumn.types";
import type { ConceptId } from "$/models/ontology/Concept/Concept.types";
import type { ValuePickerRule } from "$/models/ontology/ValuePickerRule/ValuePickerRule";
import type { AttributeFormValues } from "./conceptFormTypes";

const CONCEPT_ID = uuid<ConceptId>();
// Fixtures carry only the fields `withFieldDataTypes` and
// `makeDefaultDatasetColumnAttribute` read, so they are cast once here.
const DISTRICT_COLUMN = {
  id: uuid<DatasetColumnId>(),
  name: "district",
  dataType: "varchar",
} as DatasetColumnRead;
// `readonly`, matching `DatasetWithColumns.columns`, so one `as` suffices.
const DISTRICT_COLUMNS: readonly DatasetColumnRead[] = [DISTRICT_COLUMN];
const DATASET = {
  id: uuid<DatasetId>(),
  columns: DISTRICT_COLUMNS,
} as DatasetWithColumns;

/** A "district" field over a text column, with the given rule. */
function _districtField(options: {
  ruleType: ValuePickerRule.T;
  isArray?: boolean;
}): AttributeFormValues {
  const attribute = makeDefaultDatasetColumnAttribute({
    conceptId: CONCEPT_ID,
    name: "district",
    dataset: DATASET,
    datasetColumn: DISTRICT_COLUMN,
  });
  return {
    ...attribute,
    isArray: options.isArray ?? false,
    mappings: {
      ...attribute.mappings,
      datasetColumn: {
        ...attribute.mappings.datasetColumn,
        valuePickerRuleType: options.ruleType,
      },
    },
  };
}

describe("getDefaultConceptFormValues", () => {
  it("starts a new case type with Active as its default status, then Inactive", () => {
    const formValues = getDefaultConceptFormValues();

    expect(
      formValues.statuses.map((status) => {
        return status.name;
      }),
    ).toEqual(["Active", "Inactive"]);
    expect(formValues.defaultStatusId).toBe(formValues.statuses[0]?.id);
  });
});

describe("withFieldDataTypes", () => {
  it("stores a count over a text column as a whole number", () => {
    const [field] = withFieldDataTypes({
      attributes: [_districtField({ ruleType: "count" })],
      sourceDatasets: [{ dataset: DATASET }],
    });

    expect(field?.dataType).toBe("bigint");
  });

  it("stores a field that keeps every value as its column's type", () => {
    const [field] = withFieldDataTypes({
      attributes: [_districtField({ ruleType: "count", isArray: true })],
      sourceDatasets: [{ dataset: DATASET }],
    });

    expect(field?.dataType).toBe("varchar");
  });

  it("keeps the type of a field whose column is not among the sources", () => {
    const [field] = withFieldDataTypes({
      attributes: [_districtField({ ruleType: "count" })],
      sourceDatasets: [],
    });

    expect(field?.dataType).toBe("varchar");
  });
});

describe("withDefaultValueRule", () => {
  it("replaces the field's rule with the one every column allows", () => {
    const field = withDefaultValueRule(_districtField({ ruleType: "count" }));

    expect(field.mappings.datasetColumn.valuePickerRuleType).toBe(
      "most_frequent",
    );
  });
});
