import { z } from "zod";
import { stockContracts } from "../../registry/stockContracts";
import { parseStockInput } from "../parseStockInput/parseStockInput";
import type { StockInputByPreset, StockPresetId } from "../StockContract.types";
/** Data for ResolvedStockRequest. */
type ResolvedStockRequestResult<Id extends StockPresetId> = {
  preset: Id;
  schemaVersion: 1;
  input: StockInputByPreset[Id];
  accent?: string;
  background?: string;
};

/**
 * A validated request contains a complete independent input and explicit
 * version.
 */
export type ResolvedStockRequest = {
  [Id in StockPresetId]: ResolvedStockRequestResult<Id>;
}[StockPresetId];

/**
 * Strict transport fields shared by React, storyboard and export boundaries.
 */
export const stockRequestEnvelopeSchema = z.strictObject({
  preset: z.enum(Object.keys(stockContracts) as StockPresetId[]),
  schemaVersion: z.literal(1).default(1),
  input: z.unknown().optional(),
  accent: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  background: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
}) satisfies z.ZodType;

/**
 * Resolves omitted content only. Supplied content must be a complete document.
 */
export const stockRequestSchema = stockRequestEnvelopeSchema.transform(
  (request, context): ResolvedStockRequest => {
    try {
      const input = parseStockInput({
        preset: request.preset,
        rawInput: request.input,
      });
      // Runtime validation establishes the dependent preset/input relationship.
      return { ...request, input } as ResolvedStockRequest;
    } catch (error) {
      context.addIssue({
        code: "custom",
        path: ["input"],
        message: error instanceof Error ? error.message : "Invalid stock input",
      });
      return z.NEVER;
    }
  },
) satisfies z.ZodType;
