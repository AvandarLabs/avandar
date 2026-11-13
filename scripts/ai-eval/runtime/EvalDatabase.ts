import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { DuckDBInstance } from "@duckdb/node-api";
import { COVID_DATASETS } from "../covid/covidWorkspace";
import type { CovidDataset } from "../covid/covidWorkspace";
import type { DuckDBConnection } from "@duckdb/node-api";

/** A query result with plain JavaScript values, the way the grid shows it. */
export type EvalQueryResult = {
  columns: ReadonlyArray<{ name: string; type: string }>;
  rows: ReadonlyArray<readonly unknown[]>;
};

const DUCKDB_TYPE_BY_APP_TYPE: Record<string, string> = {
  varchar: "VARCHAR",
  bigint: "BIGINT",
  double: "DOUBLE",
  date: "DATE",
};

/** A dataset the eval database loads, from a CSV under its data directory. */
type EvalDataset = Pick<
  CovidDataset,
  "id" | "fileName" | "truthViewName" | "columns"
>;

function _buildCreateTableSql(dataset: EvalDataset, dataDir: string): string {
  const castColumns = dataset.columns
    .map((column) => {
      const duckDbType = DUCKDB_TYPE_BY_APP_TYPE[column.dataType] ?? "VARCHAR";
      return `CAST("${column.name}" AS ${duckDbType}) AS "${column.name}"`;
    })
    .join(", ");
  const csvPath = join(dataDir, dataset.fileName).replaceAll("'", "''");
  return `CREATE TABLE "${dataset.id}" AS SELECT ${castColumns} FROM read_csv('${csvPath}', header = true, quote = '"', sample_size = -1)`;
}

/** Converts DuckDB values (bigint, dates, decimals) into plain JS values. */
function _toPlainValue(value: unknown): unknown {
  if (typeof value === "bigint") {
    return Number(value);
  }
  if (value !== null && typeof value === "object") {
    return String(value);
  }
  return value;
}

async function _createTables(
  connection: DuckDBConnection,
  dataDir: string,
  datasets: readonly EvalDataset[],
): Promise<void> {
  for (const dataset of datasets) {
    await connection.run(_buildCreateTableSql(dataset, dataDir));
  }
}

async function _createTruthViews(
  connection: DuckDBConnection,
  datasets: readonly EvalDataset[],
): Promise<void> {
  for (const dataset of datasets) {
    await connection.run(
      `CREATE OR REPLACE VIEW ${dataset.truthViewName} AS SELECT * FROM "${dataset.id}"`,
    );
  }
}

async function _build(
  databasePath: string,
  dataDir: string,
  datasets: readonly EvalDataset[],
): Promise<void> {
  mkdirSync(dirname(databasePath), { recursive: true });
  const instance = await DuckDBInstance.create(databasePath);
  const connection = await instance.connect();
  try {
    await _createTables(connection, dataDir, datasets);
    await _createTruthViews(connection, datasets);
  } finally {
    connection.closeSync();
    instance.closeSync();
  }
}

/**
 * Opens the eval's DuckDB copy of a workspace, building it from the CSV
 * files on first use: the COVID workspace by default, or `datasets` from
 * `dataDir`. Tables are named by dataset id, as in the app, and each
 * dataset's truth view serves the ground-truth SQL. Opens read-only, so
 * several eval runs can share the file.
 */
async function _open(
  options: Readonly<{
    databasePath: string;
    dataDir?: string;
    datasets?: readonly EvalDataset[];
  }>,
): Promise<EvalDatabase> {
  if (!existsSync(options.databasePath)) {
    await _build(
      options.databasePath,
      options.dataDir ?? join(homedir(), "cleaned-test-data"),
      options.datasets ?? COVID_DATASETS,
    );
  }
  const instance = await DuckDBInstance.create(options.databasePath, {
    access_mode: "READ_ONLY",
  });
  return _createEvalDatabase(instance);
}

/** A DuckDB handle that runs each query on its own connection. */
export type EvalDatabase = {
  query: (sql: string) => Promise<EvalQueryResult>;
  close: () => void;
};

function _createEvalDatabase(instance: DuckDBInstance): EvalDatabase {
  return {
    query: async (sql) => {
      const connection = await instance.connect();
      try {
        const reader = await connection.runAndReadAll(sql);
        const columnNames = reader.columnNames();
        const columnTypes = reader.columnTypes();
        return {
          columns: columnNames.map((name, index) => {
            return { name, type: String(columnTypes[index]) };
          }),
          rows: reader.getRows().map((row) => {
            return row.map(_toPlainValue);
          }),
        };
      } finally {
        connection.closeSync();
      }
    },
    close: () => {
      instance.closeSync();
    },
  };
}

/** Opens the DuckDB copy of the eval workspace. */
export const EvalDatabase = { open: _open };
