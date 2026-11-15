import { makeStockJsonSchemaFromZodSchema } from "../../contracts/makeStockJsonSchemaFromZodSchema/makeStockJsonSchemaFromZodSchema";
import { LEGACY_DISPLAY_COPY } from "./legacyDisplayCopy";
import { LEGACY_TEXT_RULES } from "./legacyTextRules";
import { makeLegacyControlsFromSchema } from "./makeLegacyControlsFromSchema";
import type {
  StockContract,
  StockMetadata,
  StockSemanticRule,
} from "../../contracts/StockContract.types";
import type { LegacyStockPresetId } from "../../registry/legacyStockEntry";
import type { z } from "zod";

type Definition<Input> = {
  id: LegacyStockPresetId;
  inputSchema: z.ZodType<Input>;
  defaultInput: Input;
  fixtures: Array<{ id: string; input: Input }>;
  metadata: StockMetadata;
  defaultTextPaths: Array<Array<string | number>>;
  semanticRules: StockSemanticRule[];
};

/**
 * Creates a complete content contract from one legacy preset's authored data.
 */
export function makeLegacyContractFromDefinition<Input>(
  definition: Readonly<Definition<Input>>,
): StockContract<Input> {
  const jsonSchema = makeStockJsonSchemaFromZodSchema(definition.inputSchema);
  return {
    ...definition,
    displayCopy: LEGACY_DISPLAY_COPY[definition.id],
    semanticRules: [
      ...definition.semanticRules,
      ...LEGACY_TEXT_RULES[definition.id],
    ],
    schemaVersion: 1,
    metadataVersion: 2,
    collection: "general",
    loopFrames: 180,
    jsonSchema,
    controls: makeLegacyControlsFromSchema({
      id: definition.id,
      schema: jsonSchema,
    }),
    bindingExamples: [
      {
        sourceText: {
          id: `motionAtlas.${definition.id}.bindingExamples.0`,
          message: `Fictional authored example. ${definition.metadata.useWhen.message}`,
        },
        input: definition.defaultInput,
      },
    ],
  };
}
