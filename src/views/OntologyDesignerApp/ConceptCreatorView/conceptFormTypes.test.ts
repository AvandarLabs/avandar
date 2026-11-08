import { describe, expect, it } from "vitest";
import { uuid } from "$/lib/uuid";
import {
  getDefaultConceptFormValues,
  makeDefaultDatasetColumnAttribute,
  makeDefaultManualEntryAttribute,
  withDefaultValueRule,
  withFieldDataTypes,
} from "./conceptFormTypes";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { ValuePickerRule } from "$/models/ontology/ValuePickerRule/ValuePickerRule";
import type { AttributeFormValues } from "./conceptFormTypes";

const CONCEPT_ID = uuid<Concept.Id>();
// Fixtures carry only the fields `withFieldDataTypes` and
// `makeDefaultDatasetColumnAttribute` read, so they are cast once here.
const DISTRICT_COLUMN = {
  id: uuid<DatasetColumn.Id>(),
  name: "district",
  dataType: "varchar",
} as DatasetColumn.T;
// `readonly`, matching `DatasetWithColumns.columns`, so one `as` suffices.
const DISTRICT_COLUMNS: readonly DatasetColumn.T[] = [DISTRICT_COLUMN];
const DATASET = {
  id: uuid<Dataset.Id>(),
  columns: DISTRICT_COLUMNS,
} as Dataset.WithColumns;

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

  it("stores the default rule in place of one the column's type refuses", () => {
    const [field] = withFieldDataTypes({
      attributes: [_districtField({ ruleType: "sum" })],
      sourceDatasets: [{ dataset: DATASET }],
    });

    expect(field?.mappings.datasetColumn.valuePickerRuleType).toBe(
      "most_frequent",
    );
    expect(field?.dataType).toBe("varchar");
  });

  it("returns a manual-entry field unchanged", () => {
    const field = makeDefaultManualEntryAttribute({
      conceptId: CONCEPT_ID,
      name: "notes",
    });

    const [result] = withFieldDataTypes({
      attributes: [field],
      sourceDatasets: [{ dataset: DATASET }],
    });

    expect(result).toBe(field);
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
