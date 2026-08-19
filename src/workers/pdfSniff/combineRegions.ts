import type { DocumentMetadata, ExtractedTable, PdfCellFlag } from "./types";

export type CombinedTable = {
  outputMode: "natural" | "observations";
  cells: ReadonlyArray<readonly string[]>;
  headerRows: number;
};

const OBSERVATION_HEADER = [
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
 * Header comparison ignores case and surrounding whitespace.
 *
 * A table continuing onto a new page often repeats its header with different
 * spacing or capitalisation. Treating that as a different schema would refuse
 * to union a table that plainly is one.
 */
function _headerKey(table: ExtractedTable): string {
  const header = table.cells[0] ?? [];
  const names = header.map((name) => {
    return name.trim().toLowerCase().replace(/\s+/gu, " ");
  });
  // Joined on NUL rather than a space, so that ["a b", "c"] and ["a", "b c"]
  // stay two different schemas.
  return names.join("\u0000");
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
  const populated = params.tables.filter((table) => {
    return table.cells.length > 1;
  });

  if (populated.length === 0) {
    return { outputMode: "natural", cells: [], headerRows: 0 };
  }

  const headerKeys = new Set(populated.map(_headerKey));
  const shouldUnion =
    params.outputMode !== "observations" && headerKeys.size === 1;

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
      rows.push([
        row[subjectIndex] ?? "",
        metricIndex >= 0 ? (row[metricIndex] ?? "") : label,
        valueIndex >= 0 ?
          (row[valueIndex] ?? "")
        : (row[fallbackValueIndex] ?? ""),
        unitIndex >= 0 ? (row[unitIndex] ?? "") : "n",
        "",
        provenance ? String(provenance.page + 1) : "",
        label,
        flagged.has(rowIndex) ? "review" : "high",
        table.extractedBy,
        sourceIndex >= 0 ? (row[sourceIndex] ?? "") : "",
        doc.title ?? "",
        doc.organisation ?? "",
        doc.publishedAt ?? "",
        doc.reportNumber ?? "",
      ]);
    });
  }

  return { outputMode: "observations", cells: rows, headerRows: 1 };
}
