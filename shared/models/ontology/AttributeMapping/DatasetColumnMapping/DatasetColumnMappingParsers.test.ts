/**
 * A field that keeps every value stores no value rule. The parsers must keep
 * that absence, or a list would read back with a rule nobody chose.
 */
import { describe, expect, it } from "vitest";
import { DatasetColumnMappingParsers } from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMappingParsers.ts";

describe("DatasetColumnMappingParsers", () => {
  it("reads a mapping with no value rule as having none", () => {
    const mapping = DatasetColumnMappingParsers.fromDBReadToModelRead({
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
});
