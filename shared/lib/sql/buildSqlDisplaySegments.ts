/**
 * Splits raw SQL into display segments for pills: known datasets (by id or
 * name) and known column identifiers. The concatenation of each segment's
 * `value` or `raw` reproduces the original SQL string.
 */
import { Parser } from "node-sql-parser";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";
import type {
  SqlDisplayCatalog,
  SqlDisplaySegment,
} from "$/lib/sql/sqlDisplay.types.ts";

type AnnotatedSpan = {
  kind: "dataset" | "column";
  start: number;
  end: number;
  raw: string;
  datasetId?: DatasetId;
  datasetLabel?: string;
  columnName?: string;
};

const QUOTED_IDENT_RE = /"([^"]*)"/g;

const UUID_REGEX = new RegExp(
  [
    "^",
    "[0-9a-f]{8}-",
    "[0-9a-f]{4}-",
    "[1-5][0-9a-f]{3}-",
    "[89ab][0-9a-f]{3}-",
    "[0-9a-f]{12}",
    "$",
  ].join(""),
  "i",
);

function _isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

function _findDatasetByQuotedContent(
  content: string,
  catalog: SqlDisplayCatalog,
): { id: DatasetId; name: string } | undefined {
  const normalized = content.toLowerCase();
  return catalog.datasets.find((d) => {
    return (
      d.id === content ||
      d.id.toLowerCase() === normalized ||
      d.name === content ||
      d.name.toLowerCase() === content.toLowerCase()
    );
  });
}

function _collectQuotedDatasetSpans(
  sql: string,
  catalog: SqlDisplayCatalog,
): AnnotatedSpan[] {
  const spans: AnnotatedSpan[] = [];
  for (const match of sql.matchAll(QUOTED_IDENT_RE)) {
    const raw = match[0];
    const content = match[1] ?? "";
    const start = match.index;
    if (start === undefined) {
      continue;
    }
    const dataset = _findDatasetByQuotedContent(content, catalog);
    if (!dataset) {
      continue;
    }
    spans.push({
      kind: "dataset",
      start,
      end: start + raw.length,
      raw,
      datasetId: dataset.id,
      datasetLabel: dataset.name,
    });
  }
  return spans;
}

function _columnNamesInCatalog(catalog: SqlDisplayCatalog): Set<string> {
  const names = new Set<string>();
  for (const d of catalog.datasets) {
    for (const c of d.columns) {
      names.add(c.name);
    }
  }
  return names;
}

function _collectParserColumnSpans(
  sql: string,
  catalog: SqlDisplayCatalog,
): AnnotatedSpan[] {
  const knownColumns = _columnNamesInCatalog(catalog);
  if (knownColumns.size === 0) {
    return [];
  }
  const parser = new Parser();
  let columnEntries: string[];
  try {
    columnEntries = parser.columnList(sql, { database: "PostgresQL" });
  } catch {
    return [];
  }
  const columnNames = new Set(
    columnEntries
      .map((entry) => {
        const parts = entry.split("::");
        return parts[parts.length - 1] ?? "";
      })
      .filter((name) => {
        return name.length > 0 && knownColumns.has(name);
      }),
  );
  if (columnNames.size === 0) {
    return [];
  }

  const spans: AnnotatedSpan[] = [];
  for (const match of sql.matchAll(QUOTED_IDENT_RE)) {
    const raw = match[0];
    const content = match[1] ?? "";
    if (!columnNames.has(content)) {
      continue;
    }
    const start = match.index;
    if (start === undefined) {
      continue;
    }
    spans.push({
      kind: "column",
      start,
      end: start + raw.length,
      raw,
      columnName: content,
    });
  }
  return spans;
}

function _collectQuotedColumnSpans(
  sql: string,
  catalog: SqlDisplayCatalog,
): AnnotatedSpan[] {
  const knownColumns = _columnNamesInCatalog(catalog);
  const datasetIds = new Set(
    catalog.datasets.flatMap((d) => {
      return [d.id, d.id.toLowerCase(), d.name, d.name.toLowerCase()];
    }),
  );
  const spans: AnnotatedSpan[] = [];
  for (const match of sql.matchAll(QUOTED_IDENT_RE)) {
    const raw = match[0];
    const content = match[1] ?? "";
    const start = match.index;
    if (start === undefined) {
      continue;
    }
    if (datasetIds.has(content) || datasetIds.has(content.toLowerCase())) {
      continue;
    }
    if (_isUuid(content)) {
      continue;
    }
    if (!knownColumns.has(content)) {
      continue;
    }
    spans.push({
      kind: "column",
      start,
      end: start + raw.length,
      raw,
      columnName: content,
    });
  }
  return spans;
}

/** Drop overlapping spans; datasets win over columns at the same range. */
function _mergeSpans(spans: AnnotatedSpan[]): AnnotatedSpan[] {
  const sorted = [...spans].sort((a, b) => {
    if (a.start !== b.start) {
      return a.start - b.start;
    }
    if (a.kind === "dataset" && b.kind === "column") {
      return -1;
    }
    if (a.kind === "column" && b.kind === "dataset") {
      return 1;
    }
    return a.end - b.end;
  });

  const merged: AnnotatedSpan[] = [];
  for (const span of sorted) {
    const overlaps = merged.some((existing) => {
      return span.start < existing.end && span.end > existing.start;
    });
    if (!overlaps) {
      merged.push(span);
    }
  }
  return merged;
}

function _spansToSegments(
  sql: string,
  spans: AnnotatedSpan[],
): SqlDisplaySegment[] {
  if (spans.length === 0) {
    return [{ kind: "text", value: sql }];
  }

  const segments: SqlDisplaySegment[] = [];
  let cursor = 0;

  for (const span of spans) {
    if (span.start > cursor) {
      segments.push({
        kind: "text",
        value: sql.slice(cursor, span.start),
      });
    }
    if (span.kind === "dataset" && span.datasetId && span.datasetLabel) {
      segments.push({
        kind: "dataset",
        datasetId: span.datasetId,
        label: span.datasetLabel,
        raw: span.raw,
        start: span.start,
        end: span.end,
      });
    } else if (span.kind === "column" && span.columnName) {
      segments.push({
        kind: "column",
        name: span.columnName,
        label: span.columnName,
        raw: span.raw,
        start: span.start,
        end: span.end,
      });
    }
    cursor = span.end;
  }

  if (cursor < sql.length) {
    segments.push({ kind: "text", value: sql.slice(cursor) });
  }

  return segments;
}

/**
 * Build ordered display segments for a SQL string and workspace catalog.
 */
export function buildSqlDisplaySegments(options: {
  sql: string;
  catalog: SqlDisplayCatalog;
}): SqlDisplaySegment[] {
  const { sql, catalog } = options;
  if (sql.length === 0) {
    return [{ kind: "text", value: "" }];
  }

  const datasetSpans = _collectQuotedDatasetSpans(sql, catalog);
  const parserColumnSpans = _collectParserColumnSpans(sql, catalog);
  const fallbackColumnSpans =
    parserColumnSpans.length > 0 ?
      parserColumnSpans
    : _collectQuotedColumnSpans(sql, catalog);

  const merged = _mergeSpans([...datasetSpans, ...fallbackColumnSpans]);
  return _spansToSegments(sql, merged);
}
