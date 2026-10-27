import { z } from "zod";
import type { StockJsonSchema } from "../StockContract.types";

/**
 * Creates structural JSON Schema with exact positional tuple cardinality.
 * Runtime refinements remain separately authored semantic rules.
 */
export function makeStockJsonSchemaFromZodSchema(
  schema: Readonly<z.ZodType>,
): StockJsonSchema {
  return z.toJSONSchema(schema, {
    target: "draft-2020-12",
    unrepresentable: "throw",
    override: ({ zodSchema, jsonSchema }) => {
      if (zodSchema._zod.def.type !== "tuple") {
        return;
      }
      // The discriminant identifies the core tuple definition in Zod's
      // callback.
      const { items, rest } = (zodSchema as z.core.$ZodTuple)._zod.def;
      if (items.length === 0) {
        delete jsonSchema.prefixItems;
      }
      const minimum = items.reduce(
        (minimumItems, item, index) =>
          item._zod.optin === "optional" ? minimumItems : index + 1,
        0,
      );
      jsonSchema.minItems = Math.max(jsonSchema.minItems ?? 0, minimum);
      if (!rest) {
        jsonSchema.maxItems = Math.min(
          jsonSchema.maxItems ?? Infinity,
          items.length,
        );
        jsonSchema.items = false;
      }
    },
  });
}
