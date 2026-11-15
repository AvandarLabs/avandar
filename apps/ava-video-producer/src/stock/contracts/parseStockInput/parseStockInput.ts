import { makeLocalizedStockDataFromContract } from "../../i18n/makeLocalizedStockDataFromContract";
import { stockI18n } from "../../i18n/stockI18n/stockI18n";
import { stockContracts } from "../../registry/stockContracts";
import type { StockInputByPreset, StockPresetId } from "../StockContract.types";
import type { z } from "zod";

function _formatStockInputIssues(
  options: Readonly<{
    preset: StockPresetId;
    issues: readonly z.core.$ZodIssue[];
  }>,
): string {
  return options.issues
    .map((issue) => {
      const path = issue.path.length
        ? issue.path.map(String).join(".")
        : "input";
      return `${options.preset}: ${path}: ${issue.message}`;
    })
    .join("\n");
}

/**
 * Validates a complete authored input or returns an independent full example.
 */
export function parseStockInput<Id extends StockPresetId>({
  preset,
  rawInput,
}: Readonly<{ preset: Id; rawInput?: unknown }>): StockInputByPreset[Id];
export function parseStockInput({
  preset,
  rawInput,
}: Readonly<{
  preset: StockPresetId;
  rawInput?: unknown;
}>): StockInputByPreset[StockPresetId] {
  const contract = stockContracts[preset];
  const candidate =
    rawInput === undefined
      ? makeLocalizedStockDataFromContract({ contract, i18n: stockI18n })
          .defaultInput
      : rawInput;
  const parsed = contract.inputSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new Error(
      _formatStockInputIssues({
        preset,
        issues: parsed.error.issues,
      }),
    );
  }
  return parsed.data;
}
