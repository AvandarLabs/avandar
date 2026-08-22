import type { BBox, ExtractedTable } from "../../pdfSniff.types";

import { z } from "zod";

const MeasurementSchema = z.object({
  subject: z.string().nullable(),
  metric: z.string().min(1),
  value: z.number(),
  unit: z.enum(["n", "percent", "usd"]),
  sourceText: z.string(),
});

/** Strips a ``` fence, which models add despite being asked not to. */
function _unfence(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/u.exec(text);
  return (fenced ? fenced[1]! : text).trim();
}

/**
 * Validates a model's extraction response into an `ExtractedTable`.
 *
 * Every row is schema-checked and invalid ones are dropped rather than
 * coerced. A model that returns "several" where a number belongs has not
 * extracted a measurement, and turning that into a 0 or a NaN would put a
 * fabricated figure into a dataset that people make decisions from.
 *
 * The columns are deliberately the ones `extractProseMeasures` emits, so the
 * model's rows can be appended to the rule-based rows without a reshape.
 */
export function parseRegionResponse(params: {
  regionId: string;
  pageIndex: number;
  bbox: BBox;
  responseText: string;
}): ExtractedTable {
  const empty: ExtractedTable = {
    regionId: params.regionId,
    cells: [],
    headerRows: 0,
    flags: [],
    extractedBy: "model",
    rowProvenance: [],
  };

  let parsed: unknown;
  try {
    parsed = JSON.parse(_unfence(params.responseText));
  } catch {
    return {
      ...empty,
      flags: [
        {
          // Region-level: this is true of the response, not of one cell.
          rowIndex: -1,
          columnIndex: -1,
          reason: "unmatched_value",
          detail:
            "The assistant's response could not be read as data. The " +
            "rule-based results are unchanged.",
        },
      ],
    };
  }

  if (!Array.isArray(parsed)) {
    return empty;
  }

  // Each row is validated on its own so that one malformed row does not
  // discard the rows the model got right.
  const rows = parsed.flatMap((row: unknown) => {
    const result = MeasurementSchema.safeParse(row);
    return result.success ? [result.data] : [];
  });

  if (rows.length === 0) {
    return empty;
  }

  return {
    regionId: params.regionId,
    headerRows: 1,
    extractedBy: "model",
    flags: [],
    cells: [
      ["subject", "metric", "value", "unit", "source_text"],
      ...rows.map((row) => {
        return [
          row.subject ?? "",
          row.metric,
          String(row.value),
          row.unit,
          row.sourceText,
        ];
      }),
    ],
    // The prompt carries no per-sentence geometry, so the whole region is the
    // honest provenance for every row it returns.
    rowProvenance: rows.map(() => {
      return { page: params.pageIndex, bbox: params.bbox };
    }),
  };
}
