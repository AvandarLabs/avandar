import type { Measurement } from "../extractMeasurements/extractMeasurements";
import type { ExtractedTable } from "../pdfSniff.types";

/** The units the assistant answers in; other rule rows are left out. */
const MODEL_UNITS = new Set<Measurement["unit"]>(["n", "percent", "usd"]);

/**
 * Reads the rule-extracted rows back as measurements, so the prompt can tell
 * the model what has already been found. A row that does not round-trip is
 * dropped rather than guessed at: the worst outcome of dropping one is that
 * the model repeats a figure we already have.
 */
export function tableToMeasurements(
  table: ExtractedTable,
): readonly Measurement[] {
  return table.cells.slice(table.headerRows).flatMap((row) => {
    const value = Number(row[2]);
    const unit = row[3] as Measurement["unit"] | undefined;
    if (
      !Number.isFinite(value) ||
      unit === undefined ||
      !MODEL_UNITS.has(unit)
    ) {
      return [];
    }
    return [
      {
        subject: row[0] ? row[0] : null,
        metric: row[1] ?? "",
        value,
        unit,
        sourceText: row[4] ?? "",
      },
    ];
  });
}
