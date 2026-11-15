import { makeLegacyContractFromDefinition } from "../legacy/makeLegacyContractFromDefinition";
import {
  SCHEMA_MAPPING_DEFAULT_INPUT,
  schemaMappingFixtures,
} from "./SchemaMapping.fixtures";
import {
  schemaMappingMetadata,
  SCHEMA_MAPPING_DEFAULT_TEXT_PATHS,
} from "./SchemaMapping.metadata";
import { schemaMappingInputSchema } from "./SchemaMapping.schema";
import type { StockContract } from "../../contracts/StockContract.types";

/** Versioned content, editor controls and valid complete bindings. */
export const schemaMappingContract: StockContract<
  typeof SCHEMA_MAPPING_DEFAULT_INPUT
> = makeLegacyContractFromDefinition({
  id: "schema-mapping",
  inputSchema: schemaMappingInputSchema,
  defaultInput: SCHEMA_MAPPING_DEFAULT_INPUT,
  fixtures: schemaMappingFixtures,
  metadata: schemaMappingMetadata,
  defaultTextPaths: SCHEMA_MAPPING_DEFAULT_TEXT_PATHS,
  semanticRules: [
    {
      id: "authored-correspondence",
      paths: ["mappings"],
      description:
        "Keep each source column mapped to its authored destination field and never manufacture an identifier mapping for an unmapped source.",
    },
  ],
});
