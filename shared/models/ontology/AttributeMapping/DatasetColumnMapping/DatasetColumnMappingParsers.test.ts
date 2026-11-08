/**
 * A field that keeps every value stores no value rule. The parsers must keep
 * that absence, or a list would read back with a rule nobody chose.
 */
import { describe, expect, it } from "vitest";
import { DatasetColumnMappingParsers } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappingParsers.ts";
import type { DatasetColumnMapping } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types.ts";

const PER_MONTH_ROW = {
  bucket_column_id: "eeeeeeee-6666-4666-8666-eeeeeeeeeeee",
  concept_attribute_id: "cccccccc-3333-4333-8333-cccccccccccc",
  created_at: "2026-11-06T00:00:00+00:00",
  dataset_column_id: "eeeeeeee-5555-4555-8555-eeeeeeeeeeee",
  dataset_id: "dddddddd-4444-4444-8444-dddddddddddd",
  id: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
  updated_at: "2026-11-06T00:00:00+00:00",
  value_picker_rule_type: "avg",
  workspace_id: "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
} as const;

describe("DatasetColumnMappingParsers", () => {
  it("reads a mapping with no value rule as having none", () => {
    const mapping = DatasetColumnMappingParsers.fromDBReadToModelRead({
      bucket_column_id: null,
      id: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
      workspace_id: "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
      concept_attribute_id: "cccccccc-3333-4333-8333-cccccccccccc",
      value_picker_rule_type: null,
      dataset_id: "dddddddd-4444-4444-8444-dddddddddddd",
      dataset_column_id: "eeeeeeee-5555-4555-8555-eeeeeeeeeeee",
      created_at: "2026-11-06T00:00:00+00:00",
      updated_at: "2026-11-06T00:00:00+00:00",
    });

    expect(mapping.valuePickerRuleType).toBeUndefined();
  });

  it("reads a mapping's date column from its row", () => {
    const mapping =
      DatasetColumnMappingParsers.fromDBReadToModelRead(PER_MONTH_ROW);

    expect(mapping.bucketColumnId).toBe(PER_MONTH_ROW.bucket_column_id);
  });

  it("sends a mapping's date column when the mapping is inserted", () => {
    const dbInsert = DatasetColumnMappingParsers.fromModelInsertToDBInsert({
      type: "dataset_column",
      workspaceId:
        PER_MONTH_ROW.workspace_id as DatasetColumnMapping["workspaceId"],
      conceptAttributeId:
        PER_MONTH_ROW.concept_attribute_id as DatasetColumnMapping["conceptAttributeId"],
      valuePickerRuleType: "avg",
      datasetId: PER_MONTH_ROW.dataset_id as DatasetColumnMapping["datasetId"],
      datasetColumnId:
        PER_MONTH_ROW.dataset_column_id as DatasetColumnMapping["datasetColumnId"],
      bucketColumnId:
        PER_MONTH_ROW.bucket_column_id as DatasetColumnMapping["datasetColumnId"],
    });

    expect(dbInsert).toMatchObject({
      bucket_column_id: PER_MONTH_ROW.bucket_column_id,
    });
  });
});
