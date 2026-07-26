/**
 * Splits raw SQL into display segments for pills: known datasets (by id or
 * name) and known column identifiers. The concatenation of each segment's
 * `value` or `raw` reproduces the original SQL string.
 */
import { prop } from "@utils";
import { Parser } from "node-sql-parser";
import type {
  SqlDisplayCatalog,
  SqlDisplaySegment,
} from "@/components/sql/sql-helpers/sqlDisplay.types";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";

type AnnotatedSpan = {
  kind: "dataset" | "column";
  start: number;
  end: number;
  raw: string;
  datasetId?: DatasetId;
  datasetLabel?: string;
  columnName?: string;
};

/** Double-quoted and backtick-quoted identifiers (DuckDB / sqlify output). */
const QUOTED_IDENT_PATTERNS = [/"([^"]*)"/g, /`([^`]*)`/g] as const;

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

type QuotedIdentifier = {
  content: string;
  raw: string;
  start: number;
  end: number;
};

/** All double/backtick-quoted identifiers in `sql`, in source order. */
function _findQuotedIdentifiers(sql: string): QuotedIdentifier[] {
  return QUOTED_IDENT_PATTERNS.flatMap((pattern) => {
    return [...sql.matchAll(pattern)].flatMap((match): QuotedIdentifier[] => {
      const raw = match[0];
      const content = match[1] ?? "";
      const start = match.index;
      if (start === undefined) {
        return [];
      }
      return [{ content, raw, start, end: start + raw.length }];
    });
  });
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
      d.name.toLowerCase() === normalized
    );
  });
}

function _collectQuotedDatasetSpans(
  sql: string,
  catalog: SqlDisplayCatalog,
): AnnotatedSpan[] {
  return _findQuotedIdentifiers(sql).flatMap<AnnotatedSpan>(
    ({ content, raw, start, end }) => {
      const dataset = _findDatasetByQuotedContent(content, catalog);
      if (!dataset) {
        return [];
      }
      return [
        {
          kind: "dataset",
          start,
          end,
          raw,
          datasetId: dataset.id,
          datasetLabel: dataset.name,
        },
      ];
    },
  );
}

function _columnNamesInCatalog(catalog: SqlDisplayCatalog): Set<string> {
  return new Set(
    catalog.datasets.flatMap((dataset) => {
      return dataset.columns.map(prop("name"));
    }),
  );
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

  return _findQuotedIdentifiers(sql)
    .filter(({ content }) => {
      return columnNames.has(content);
    })
    .map<AnnotatedSpan>(({ content, raw, start, end }) => {
      return {
        kind: "column",
        start,
        end,
        raw,
        columnName: content,
      };
    });
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
  return _findQuotedIdentifiers(sql)
    .filter(({ content }) => {
      if (datasetIds.has(content) || datasetIds.has(content.toLowerCase())) {
        return false;
      }
      if (_isUuid(content)) {
        return false;
      }
      return knownColumns.has(content);
    })
    .map<AnnotatedSpan>(({ content, raw, start, end }) => {
      return {
        kind: "column",
        start,
        end,
        raw,
        columnName: content,
      };
    });
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

  return sorted.reduce<AnnotatedSpan[]>((merged, span) => {
    const overlaps = merged.some((existing) => {
      return span.start < existing.end && span.end > existing.start;
    });
    if (!overlaps) {
      merged.push(span);
    }
    return merged;
  }, []);
}

function _spansToSegments(
  sql: string,
  spans: AnnotatedSpan[],
): SqlDisplaySegment[] {
  if (spans.length === 0) {
    return [{ kind: "text", value: sql }];
  }

  // Fold the spans into segments, tracking the running `cursor` so the plain
  // text between pills is emitted in order.
  const { segments, cursor } = spans.reduce<{
    segments: SqlDisplaySegment[];
    cursor: number;
  }>(
    (acc, span) => {
      if (span.start > acc.cursor) {
        acc.segments.push({
          kind: "text",
          value: sql.slice(acc.cursor, span.start),
        });
      }
      if (span.kind === "dataset" && span.datasetId && span.datasetLabel) {
        acc.segments.push({
          kind: "dataset",
          datasetId: span.datasetId,
          label: span.datasetLabel,
          raw: span.raw,
          start: span.start,
          end: span.end,
        });
      } else if (span.kind === "column" && span.columnName) {
        acc.segments.push({
          kind: "column",
          name: span.columnName,
          label: span.columnName,
          raw: span.raw,
          start: span.start,
          end: span.end,
        });
      }
      acc.cursor = span.end;
      return acc;
    },
    { segments: [], cursor: 0 },
  );

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
