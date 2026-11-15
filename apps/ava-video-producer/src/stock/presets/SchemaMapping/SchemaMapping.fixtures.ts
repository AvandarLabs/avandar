import type { StockContract } from "../../contracts/StockContract.types";
import type { SchemaMappingInput } from "./SchemaMapping.schema";

/** Complete fictional example used only when input is omitted. */
export const SCHEMA_MAPPING_DEFAULT_INPUT: SchemaMappingInput = {
  mappings: [
    { source: "record_id", target: "id", type: "string" },
    { source: "created_at", target: "timestamp", type: "date" },
    { source: "value", target: "amount", type: "number" },
    { source: "category", target: "group", type: "string" },
  ],
  sourceLabel: "Source fields",
  targetLabel: "Unified fields",
  showChecks: true,
};

/** The maximum supported collection density in the authored layout. */
export const schemaMappingDenseInput: SchemaMappingInput = {
  ...SCHEMA_MAPPING_DEFAULT_INPUT,
};

/** A complete smaller or differently selected authored example. */
export const schemaMappingChangedInput: SchemaMappingInput = {
  ...SCHEMA_MAPPING_DEFAULT_INPUT,
  mappings: [{ source: "identifier", target: "case_key", type: "string" }],
  sourceLabel: "Dataset",
  targetLabel: "Case fields",
  showChecks: false,
};

/** Named examples available to editors and semantic regression checks. */
export const schemaMappingFixtures: StockContract<
  typeof SCHEMA_MAPPING_DEFAULT_INPUT
>["fixtures"] = [
  { id: "default", input: SCHEMA_MAPPING_DEFAULT_INPUT },
  { id: "dense", input: schemaMappingDenseInput },
  { id: "changed", input: schemaMappingChangedInput },
];
