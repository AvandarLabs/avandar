/*
 * The orchestration loop the entry-point `main.ts` calls. Reads every
 * `supabase/migrations/*.sql`, partitions each one, transpiles the
 * kept statements, and writes one `.gen.sql` per Postgres migration
 * (even when no schema-shape statements survived, so the output dir
 * stays 1-to-1 with `supabase/migrations/`).
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { EXCLUDED_TABLES, SYNCABLE_TABLES } from "../../sync/syncable-tables";
import { extractStatements } from "./parse";
import { partitionStatements } from "./partition";
import {
  assertSqlglotAvailable,
  stripPostgresIsms,
  transpileToSqlite,
} from "./transpile";
import {
  buildHeader,
  printDroppedFkInfo,
  printHandEditWarning,
} from "./warnings";
import type {
  AnnotatedStatement,
  GeneratorSummary,
  PartitionResult,
} from "./types";

type SourceFileResult = {
  included: number;
  skipped: number;
  needsHandEdit: AnnotatedStatement[];
  droppedFks: AnnotatedStatement[];
};

/**
 * Run the full generator end-to-end against `supabase/migrations/` and
 * write the SQLite equivalents to `outDir`. Used by the
 * `pnpm desktop:sqlite:gen-migrations` script, and re-used by the
 * drift-check script.
 *
 * @param args - The Postgres source directory and the SQLite output
 *   directory. Output dir is wiped and re-created (the matching
 *   `README.md`, if present, is preserved).
 * @returns Summary counts plus the per-source statements that need a
 *   human hand-edit or had their FK silently dropped.
 */
export function runGenerator(
  args: Readonly<{ sourceDir: string; outDir: string }>,
): GeneratorSummary {
  const { sourceDir, outDir } = args;
  assertSqlglotAvailable();
  _resetOutputDir(outDir);

  const sourceFiles = readdirSync(sourceDir)
    .filter((f) => {
      return f.endsWith(".sql");
    })
    .sort();
  const perFile = sourceFiles.map((sourceFile) => {
    return _processSource({ sourceFile, sourceDir, outDir });
  });

  const summary: GeneratorSummary = {
    filesWritten: perFile.length,
    statementsIncluded: perFile.reduce((acc, r) => {
      return acc + r.included;
    }, 0),
    statementsSkipped: perFile.reduce((acc, r) => {
      return acc + r.skipped;
    }, 0),
    needsHandEdit: perFile.flatMap((r) => {
      return r.needsHandEdit;
    }),
    droppedFks: perFile.flatMap((r) => {
      return r.droppedFks;
    }),
  };

  if (summary.needsHandEdit.length > 0) {
    printHandEditWarning(summary.needsHandEdit);
  }
  if (summary.droppedFks.length > 0) {
    printDroppedFkInfo({
      items: summary.droppedFks,
      syncable: SYNCABLE_TABLES,
      excluded: EXCLUDED_TABLES,
    });
  }
  return summary;
}

/*
 * Process one Postgres migration: read, parse, partition, transpile,
 * and write the matching `.gen.sql`. Returns per-source counts and
 * annotated statements so the caller can fold them into the overall
 * summary.
 *
 * Throws when the partition step produces `unknown` statements (the
 * classifier or the manifest needs to grow before the run can
 * succeed).
 */
function _processSource(
  args: Readonly<{
    sourceFile: string;
    sourceDir: string;
    outDir: string;
  }>,
): SourceFileResult {
  const { sourceFile, sourceDir, outDir } = args;
  const raw = readFileSync(join(sourceDir, sourceFile), "utf8");
  const partition = partitionStatements({
    statements: extractStatements(raw),
    syncable: SYNCABLE_TABLES,
    excluded: EXCLUDED_TABLES,
  });
  if (partition.unknown.length > 0) {
    _throwOnUnknown({ sourceFile, partition });
  }

  writeFileSync(
    join(outDir, sourceFile.replace(/\.sql$/i, ".gen.sql")),
    _renderBody({ sourceFile, partition }),
  );

  return {
    included: partition.included.length,
    skipped: partition.skipped.length,
    needsHandEdit: partition.needsHandEdit.map((statement) => {
      return { sourceFile, statement };
    }),
    droppedFks: partition.droppedFks.map((statement) => {
      return { sourceFile, statement };
    }),
  };
}

/*
 * Render the body of a single `.gen.sql`. Always emits a file (even
 * when no schema-shape statements survived) so
 * `apps/desktop/migrations/` stays 1-to-1 with `supabase/migrations/`.
 */
function _renderBody(
  args: Readonly<{ sourceFile: string; partition: PartitionResult }>,
): string {
  const { sourceFile, partition } = args;
  const header = buildHeader({ sourceFile, partition });
  if (partition.included.length === 0) {
    return `${header}\n-- No schema-shape changes: every statement was RLS / GRANT / function / trigger / type / data backfill, none of which has a SQLite equivalent.\n`;
  }
  const transpiled = transpileToSqlite(
    partition.included.map((s) => {
      return s.sql;
    }),
  ).map((sql) => {
    return stripPostgresIsms(sql);
  });
  return `${header}\n${transpiled.join(";\n\n")};\n`;
}

function _resetOutputDir(outDir: string): void {
  // Wipe and recreate the output directory, but preserve README.md so
  // we do not nuke the operator-facing documentation that lives
  // alongside.
  const readmePath = join(outDir, "README.md");
  const readme =
    existsSync(readmePath) ? readFileSync(readmePath, "utf8") : undefined;
  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
  }
  mkdirSync(outDir, { recursive: true });
  if (readme !== undefined) {
    writeFileSync(readmePath, readme);
  }
}

function _throwOnUnknown(
  args: Readonly<{ sourceFile: string; partition: PartitionResult }>,
): never {
  const { sourceFile, partition } = args;
  const samples = partition.unknown.slice(0, 5).map((s) => {
    const reason =
      s.kind === "unknown" ? "unrecognised leading keyword"
      : s.primaryTable === undefined ?
        "schema-shape with no detectable primary table"
      : `uncategorised table: ${s.primaryTable}`;
    const preview = s.sql.replace(/\s+/g, " ").slice(0, 120);
    const ellipsis = s.sql.length > 120 ? "..." : "";
    return `  - [${reason}] ${preview}${ellipsis}`;
  });
  throw new Error(
    `gen-sqlite-migrations: ${sourceFile} has ${partition.unknown.length} unhandled statement(s). Fix by extending classifyStatement() (in parse.ts) or by categorising the table in apps/desktop/sync/syncable-tables.ts.\n${samples.join("\n")}`,
  );
}
