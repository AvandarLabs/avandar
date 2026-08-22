import type {
  DocumentMetadata,
  ExtractedTable,
  PdfCellFlag,
} from "../pdfSniff.types";

import { extractMeasurements } from "../extractMeasurements/extractMeasurements";
import { normalizeCellValue } from "../normalizeCellValue/normalizeCellValue";

export type CombinedTable = {
  outputMode: "natural" | "observations";
  cells: ReadonlyArray<readonly string[]>;
  headerRows: number;
};

export const OBSERVATION_HEADER = [
  "subject",
  "metric",
  "value",
  "unit",
  "period",
  "page",
  "region_label",
  "confidence",
  "extracted_by",
  "source_text",
  "doc_title",
  "doc_org",
  "doc_date",
  "doc_report_no",
] as const;

/**
 * Tables that produced rows, which is the only set the union rule looks at.
 *
 * A region that yielded nothing but its header cannot disagree with anything,
 * so counting it would block a union that is plainly available.
 */
export function getPopulatedTables(
  tables: readonly ExtractedTable[],
): readonly ExtractedTable[] {
  return tables.filter((table) => {
    return table.cells.length > 1;
  });
}

/**
 * Whether the selected regions share one set of printed columns to keep.
 *
 * Exported because the import UI has to say whether keeping them is even an
 * option, and this is the rule that decides it. Reimplementing it there would
 * be a second implementation of the union rule, and the two would drift: the
 * control would offer a choice this function does not honour.
 */
export function canKeepPrintedColumns(params: {
  tables: readonly ExtractedTable[];
}): boolean {
  const populated = getPopulatedTables(params.tables);
  return (
    populated.length > 0 &&
    new Set(populated.map(getPrintedColumnKey)).size === 1
  );
}

/**
 * Header comparison ignores case and surrounding whitespace.
 *
 * A table continuing onto a new page often repeats its header with different
 * spacing or capitalisation. Treating that as a different schema would refuse
 * to union a table that plainly is one.
 */
export function getPrintedColumnKey(table: ExtractedTable): string {
  const header = table.cells[0] ?? [];
  const names = header.map((name) => {
    return name.trim().toLowerCase().replace(/\s+/gu, " ");
  });
  // Joined on NUL rather than a space, so that ["a b", "c"] and ["a", "b c"]
  // stay two different schemas.
  return names.join("\u0000");
}

/** What `normalizeCellValue` leaves behind when a cell really is a number. */
const NUMERIC = /^-?\d+(\.\d+)?$/u;

/**
 * Whether a cell can stand in the observations `value` column at all.
 *
 * The schema's `value` is numeric, with `unit` absorbing the `$`, `%` or `M`,
 * so `normalizeCellValue` is the right judge: it is what decides the same
 * question for the natural-mode dataset.
 */
function _isNumericValue(value: string): boolean {
  return NUMERIC.test(normalizeCellValue(value));
}

/**
 * Builds one observation row.
 *
 * Both paths below go through here so that the column order can only be
 * written once. Two hand-maintained fourteen-element arrays would drift, and
 * a silently transposed pair of columns is not a failure any test would
 * obviously catch.
 */
function _observation(params: {
  subject: string;
  metric: string;
  value: string;
  unit: string;
  page: string;
  regionLabel: string;
  confidence: "high" | "review";
  extractedBy: ExtractedTable["extractedBy"];
  sourceText: string;
  doc: DocumentMetadata;
}): string[] {
  return [
    params.subject,
    params.metric,
    params.value,
    params.unit,
    "",
    params.page,
    params.regionLabel,
    params.confidence,
    params.extractedBy,
    params.sourceText,
    params.doc.title ?? "",
    // KNOWN GAP: `organisation` comes from the PDF's `Author` field, which is
    // whoever last saved the file as often as it is the publisher. Measured
    // on the gate documents, IMC SitRep #1 gives "Roger Shambuyi", a person,
    // and the OCHA update gives null. This column therefore lands on every
    // observation row and must not be treated as a reliable join key until
    // the organisation is read from the page rather than the file metadata.
    params.doc.organisation ?? "",
    params.doc.publishedAt ?? "",
    params.doc.reportNumber ?? "",
  ];
}

function _flaggedRows(flags: readonly PdfCellFlag[]): Set<number> {
  return new Set(
    flags
      .filter((flag) => {
        // `rowIndex: -1` is a region-level flag, not a coordinate, so it must
        // not mark some row as needing review.
        return flag.rowIndex >= 0;
      })
      .map((flag) => {
        return flag.rowIndex;
      }),
  );
}

/**
 * Combines the regions a user selected into one dataset.
 *
 * The rule is that matching headers union and differing headers normalise.
 * That single rule covers both "this table continues on the next page" and
 * "these are a map and a KPI row that have nothing in common", which are the
 * same question asked of different inputs.
 */
export function combineRegions(params: {
  tables: readonly ExtractedTable[];
  regionLabels: Readonly<Record<string, string>>;
  documentMetadata: DocumentMetadata;
  outputMode?: "natural" | "observations";
}): CombinedTable {
  const populated = getPopulatedTables(params.tables);

  if (populated.length === 0) {
    return { outputMode: "natural", cells: [], headerRows: 0 };
  }

  const shouldUnion =
    params.outputMode !== "observations" &&
    canKeepPrintedColumns({ tables: params.tables });

  if (shouldUnion) {
    const [first] = populated;
    return {
      outputMode: "natural",
      headerRows: 1,
      cells: [
        first!.cells[0]!,
        ...populated.flatMap((table) => {
          return table.cells.slice(table.headerRows);
        }),
      ],
    };
  }

  const doc = params.documentMetadata;
  const rows: string[][] = [[...OBSERVATION_HEADER]];

  for (const table of populated) {
    const header = table.cells[0] ?? [];
    const flagged = _flaggedRows(table.flags);
    const label = params.regionLabels[table.regionId] ?? table.regionId;

    // Which columns of this region's natural schema map onto which
    // observation fields. Extractors emit known headers, so this is a lookup
    // rather than a guess.
    const subjectIndex = Math.max(
      0,
      header.findIndex((name) => {
        return /^(label|subject|heading|district|state|name)$/iu.test(name);
      }),
    );
    const valueIndex = header.findIndex((name) => {
      return /^value$/iu.test(name);
    });
    const metricIndex = header.findIndex((name) => {
      return /^metric$/iu.test(name);
    });
    const unitIndex = header.findIndex((name) => {
      return /^unit$/iu.test(name);
    });
    const sourceIndex = header.findIndex((name) => {
      return /^source_text$/iu.test(name);
    });

    // With no column literally called "value", the measure is the column just
    // right of the subject. Hardcoding column 1 instead would make a
    // repeating-blocks region (`number`, `heading`, ...fields) repeat its
    // heading as both the subject and the value.
    const fallbackValueIndex = subjectIndex + 1;

    table.cells.slice(table.headerRows).forEach((row, rowIndex) => {
      const provenance = table.rowProvenance[rowIndex];
      const common = {
        page: provenance ? String(provenance.page + 1) : "",
        regionLabel: label,
        confidence: flagged.has(rowIndex)
          ? ("review" as const)
          : ("high" as const),
        extractedBy: table.extractedBy,
        doc,
      };
      const subject = row[subjectIndex] ?? "";
      const candidateValue =
        valueIndex >= 0
          ? (row[valueIndex] ?? "")
          : (row[fallbackValueIndex] ?? "");

      if (_isNumericValue(candidateValue)) {
        rows.push(
          _observation({
            ...common,
            subject,
            metric: metricIndex >= 0 ? (row[metricIndex] ?? "") : label,
            value: candidateValue,
            // A region whose own schema names a unit is the authority on its
            // own rows. Everything else reads the unit the extractor carried
            // beside the cells, and only a region that read none at all
            // falls back to a bare count.
            unit:
              unitIndex >= 0
                ? (row[unitIndex] ?? "")
                : (table.rowUnits?.[rowIndex] ?? "n"),
            sourceText: sourceIndex >= 0 ? (row[sourceIndex] ?? "") : "",
          }),
        );
        return;
      }

      // The row's "value" is prose, which the spec settles: non-numeric
      // content has no place in this schema. Selecting the OCHA pillars in
      // observations mode contributes their embedded figures and drops the
      // prose, so the row's text is mined for measurements instead of being
      // poured into a numeric column. Every other column is scanned, not just
      // the candidate, because a block's figures are spread across its fields.
      row.forEach((cell, columnIndex) => {
        if (columnIndex === subjectIndex) {
          return;
        }
        for (const measurement of extractMeasurements(cell)) {
          rows.push(
            _observation({
              ...common,
              // A measurement that named its own subject ("...in Darfur")
              // knows better than the row does.
              subject: measurement.subject ?? subject,
              metric: measurement.metric,
              value: String(measurement.value),
              unit: measurement.unit,
              sourceText: measurement.sourceText,
            }),
          );
        }
      });

      // A row that yielded nothing is dropped rather than emitted with an
      // empty or textual value: an absent row is honest, a lying one is not.
    });
  }

  return { outputMode: "observations", cells: rows, headerRows: 1 };
}
