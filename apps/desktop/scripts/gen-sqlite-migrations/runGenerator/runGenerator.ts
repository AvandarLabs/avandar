import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { prop } from "@avandar/utils";
import {
  EXCLUDED_TABLES,
  SYNCABLE_TABLES,
} from "../../../sync/syncable-tables";
import { getManualMigrationBodyFromSourceFile } from "../getManualMigrationBodyFromSourceFile";
import { extractStatements } from "../parse";
import { partitionStatements } from "../partition";
import {
  assertSqlglotAvailable,
  stripPostgresIsms,
  transpileToSqlite,
} from "../transpile";
import {
  buildHeader,
  printDroppedFkInfo,
  printHandEditWarning,
} from "../warnings";
import type {
  AnnotatedStatement,
  GeneratorSummary,
  PartitionResult,
} from "../types";

type SourceFileResult = {
  included: number;
  skipped: number;
  needsHandEdit: AnnotatedStatement[];
  droppedForeignKeys: AnnotatedStatement[];
};

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
  options: Readonly<{
    sourceFile: string;
    sourceDirectory: string;
    outputDirectory: string;
  }>,
): SourceFileResult {
  const { sourceFile, sourceDirectory, outputDirectory } = options;
  const sourceSql = readFileSync(join(sourceDirectory, sourceFile), "utf8");
  const partition = partitionStatements({
    statements: extractStatements(sourceSql),
    syncable: SYNCABLE_TABLES,
    excluded: EXCLUDED_TABLES,
  });
  if (partition.unknown.length > 0) {
    _throwOnUnknown({ sourceFile, partition });
  }

  writeFileSync(
    join(outputDirectory, sourceFile.replace(/\.sql$/i, ".gen.sql")),
    _renderBody({ sourceFile, partition }),
  );

  return {
    included: partition.included.length,
    skipped: partition.skipped.length,
    needsHandEdit: partition.needsHandEdit.map((statement) => {
      return { sourceFile, statement };
    }),
    droppedForeignKeys: partition.droppedForeignKeys.map((statement) => {
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
  options: Readonly<{ sourceFile: string; partition: PartitionResult }>,
): string {
  const { sourceFile, partition } = options;
  const header = buildHeader({ sourceFile, partition });
  const manualBody = getManualMigrationBodyFromSourceFile(sourceFile);
  if (manualBody !== undefined) {
    return `${header}\n${manualBody}`;
  }
  if (partition.included.length === 0) {
    return `${header}\n-- No schema-shape changes: every statement was RLS / GRANT / function / trigger / type / data backfill, none of which has a SQLite equivalent.\n`;
  }
  const transpiled = transpileToSqlite(partition.included.map(prop("sql"))).map(
    (sql) => {
      return stripPostgresIsms(sql);
    },
  );
  return `${header}\n${transpiled.join(";\n\n")};\n`;
}

function _resetOutputDirectory(outputDirectory: string): void {
  // Wipe and recreate the output directory, but preserve README.md so
  // we do not nuke the operator-facing documentation that lives
  // alongside.
  const readmePath = join(outputDirectory, "README.md");
  const readme = existsSync(readmePath)
    ? readFileSync(readmePath, "utf8")
    : undefined;
  if (existsSync(outputDirectory)) {
    rmSync(outputDirectory, { recursive: true, force: true });
  }
  mkdirSync(outputDirectory, { recursive: true });
  if (readme !== undefined) {
    writeFileSync(readmePath, readme);
  }
}

function _throwOnUnknown(
  options: Readonly<{ sourceFile: string; partition: PartitionResult }>,
): never {
  const { sourceFile, partition } = options;
  const samples = partition.unknown.slice(0, 5).map((statement) => {
    const reason =
      statement.kind === "unknown"
        ? "unrecognised leading keyword"
        : statement.primaryTable === undefined
          ? "schema-shape with no detectable primary table"
          : `uncategorised table: ${statement.primaryTable}`;
    const preview = statement.sql.replace(/\s+/g, " ").slice(0, 120);
    const ellipsis = statement.sql.length > 120 ? "..." : "";
    return `  - [${reason}] ${preview}${ellipsis}`;
  });
  throw new Error(
    `gen-sqlite-migrations: ${sourceFile} has ${partition.unknown.length} unhandled statement(s). Fix by extending classifyStatement() (in parse.ts) or by categorising the table in apps/desktop/sync/syncable-tables.ts.\n${samples.join("\n")}`,
  );
}

function _getGeneratorSummary(
  sourceFileResults: readonly SourceFileResult[],
): GeneratorSummary {
  return {
    filesWritten: sourceFileResults.length,
    statementsIncluded: sourceFileResults.reduce((total, sourceFileResult) => {
      return total + sourceFileResult.included;
    }, 0),
    statementsSkipped: sourceFileResults.reduce((total, sourceFileResult) => {
      return total + sourceFileResult.skipped;
    }, 0),
    needsHandEdit: sourceFileResults.flatMap(prop("needsHandEdit")),
    droppedForeignKeys: sourceFileResults.flatMap(prop("droppedForeignKeys")),
  };
}

function _printGeneratorWarnings(summary: Readonly<GeneratorSummary>): void {
  if (summary.needsHandEdit.length > 0) {
    printHandEditWarning(summary.needsHandEdit);
  }
  if (summary.droppedForeignKeys.length > 0) {
    printDroppedFkInfo({
      items: summary.droppedForeignKeys,
      syncable: SYNCABLE_TABLES,
      excluded: EXCLUDED_TABLES,
    });
  }
}

/**
 * Generates SQLite equivalents for all Postgres migrations in a directory.
 * Returns aggregate generation results and manual-review warnings.
 */
export function runGenerator(
  options: Readonly<{ outputDirectory: string; sourceDirectory: string }>,
): GeneratorSummary {
  const { outputDirectory, sourceDirectory } = options;
  assertSqlglotAvailable();
  _resetOutputDirectory(outputDirectory);
  const sourceFiles = readdirSync(sourceDirectory)
    .filter((sourceFileName) => {
      return sourceFileName.endsWith(".sql");
    })
    .sort();
  const sourceFileResults = sourceFiles.map((sourceFile) => {
    return _processSource({ sourceFile, sourceDirectory, outputDirectory });
  });
  const summary = _getGeneratorSummary(sourceFileResults);
  _printGeneratorWarnings(summary);
  return summary;
}
