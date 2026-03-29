import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  duckDBDescribeColumnTypeToSniffable,
  SNIFF_CSV_MAX_ROWS,
} from "@ava-etl/NodeDuckDB/DuckDBSniffableDataType";
import duckdb from "duckdb";
import type { DuckDBSniffableDataType } from "@ava-etl/NodeDuckDB/DuckDBSniffableDataType";

type UnknownRow = Record<string, unknown>;

/**
 * Promisifies `Connection.all` for a single SQL statement.
 */
function _connectionAll(
  connection: duckdb.Connection,
  sql: string,
): Promise<duckdb.TableData> {
  return new Promise((resolve, reject) => {
    connection.all(
      sql,
      (err: duckdb.DuckDbError | null, rows: duckdb.TableData) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(rows);
      },
    );
  });
}

/**
 * Promisifies `Connection.exec`.
 */
function _connectionExec(
  connection: duckdb.Connection,
  sql: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    connection.exec(sql, (err: duckdb.DuckDbError | null) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

/**
 * Promisifies `Connection.close`.
 */
function _connectionClose(connection: duckdb.Connection): Promise<void> {
  return new Promise((resolve, reject) => {
    connection.close((err: duckdb.DuckDbError | null) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

/**
 * Promisifies `Database.close`.
 */
function _databaseClose(db: duckdb.Database): Promise<void> {
  return new Promise((resolve, reject) => {
    db.close((err: duckdb.DuckDbError | null) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

function _quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function _escapeSQLSingleQuotedString(value: string): string {
  return value.replace(/'/g, "''");
}

function _normalizeCellValue(value: unknown): unknown {
  if (typeof value === "bigint") {
    return Number(value);
  }
  return value;
}

function _normalizeRow(row: UnknownRow): UnknownRow {
  const entries = Object.entries(row).map(([key, cell]) => {
    return [key, _normalizeCellValue(cell)] as const;
  });
  return Object.fromEntries(entries);
}

function _applyParams(
  queryString: string,
  params: Record<string, string | number | bigint | undefined> | undefined,
): string {
  if (!params) {
    return queryString;
  }
  return Object.entries(params).reduce((current, [paramName, argValue]) => {
    if (argValue === undefined) {
      return current;
    }
    return current.replace(
      new RegExp(`\\$${paramName}\\$`, "g"),
      String(argValue),
    );
  }, queryString);
}

export type NodeDuckDBReadCSVColumn = Readonly<{
  name: string;
  /** DuckDB type for `read_csv` `columns={...}` casts. */
  type: DuckDBSniffableDataType;
}>;

/**
 * One column from {@link NodeDuckDB.sniffCSV} (name plus sniffable type).
 */
export type NodeDuckDBSniffCSVColumn = Readonly<{
  name: string;
  type: DuckDBSniffableDataType;
}>;

export type NodeDuckDBReadCSVIntoViewOptions = Readonly<{
  /** Absolute or relative path to the CSV file on disk. */
  csvPath: string;
  /** Name of the view to create in the `main` schema. */
  viewName: string;
  /**
   * When set, passed to `read_csv` as `columns={...}`; when omitted, types are
   * inferred (`auto_detect` applies).
   */
  columns?: readonly NodeDuckDBReadCSVColumn[];
  autoDetect?: boolean;
  header?: boolean;
  skip?: number;
  delimiter?: string;
}>;

/**
 * Thin Node.js wrapper around the `duckdb` native bindings: raw SQL, CSV
 * views, and ZSTD Parquet export (DuckDB `COMPRESSION ZSTD`).
 */
export class NodeDuckDB {
  readonly #db: duckdb.Database;

  readonly #connection: duckdb.Connection;

  /**
   * @param options.databasePath DuckDB file path, or `:memory:` (default).
   */
  constructor(options?: { databasePath?: string }) {
    const path = options?.databasePath ?? ":memory:";
    this.#db = new duckdb.Database(path);
    this.#connection = this.#db.connect();
  }

  /**
   * Runs a SQL string and returns result rows as plain objects.
   *
   * Optional `$paramName$` placeholders are replaced with `String(value)` from
   * `params` (same idea as `DuckDBClient.runRawQuery`).
   */
  async runRawQuery<RowObject extends UnknownRow = UnknownRow>(
    queryString: string,
    options?: {
      params?: Record<string, string | number | bigint | undefined>;
    },
  ): Promise<readonly RowObject[]> {
    const sql = _applyParams(queryString, options?.params);
    const rows = await _connectionAll(this.#connection, sql);
    return rows.map((row) => {
      return _normalizeRow(row as UnknownRow) as RowObject;
    });
  }

  /**
   * Executes SQL without returning rows (DDL, COPY, etc.).
   */
  async execSQL(sql: string): Promise<void> {
    await _connectionExec(this.#connection, sql);
  }

  /**
   * Infers column names and types using DuckDB `sniff_csv` (CSV sniffer), with
   * `sample_size` set to {@link SNIFF_CSV_MAX_ROWS}. Passes `header=true` so
   * the first row is always treated as the header (avoids `column0`-style
   * names when auto-detect misclassifies the file).
   */
  async sniffCSV(options: {
    csvPath: string;
  }): Promise<readonly NodeDuckDBSniffCSVColumn[]> {
    const pathLiteral = _escapeSQLSingleQuotedString(options.csvPath);
    const sampleSize = String(SNIFF_CSV_MAX_ROWS);
    const sql =
      `SELECT * FROM sniff_csv('${pathLiteral}', ` +
      `header=true, sample_size=${sampleSize})`;
    const rows = await this.runRawQuery<{
      Columns: ReadonlyArray<{ name: string; type: string }>;
    }>(sql);
    const sniffRow = rows[0];
    if (!sniffRow?.Columns) {
      return [];
    }
    return sniffRow.Columns.map((column) => {
      return {
        name: column.name,
        type: duckDBDescribeColumnTypeToSniffable(column.type),
      };
    });
  }

  /**
   * Creates or replaces a view that reads a CSV via `read_csv`.
   */
  async readCSVIntoView(
    options: NodeDuckDBReadCSVIntoViewOptions,
  ): Promise<void> {
    const {
      csvPath,
      viewName,
      columns,
      autoDetect = true,
      header,
      skip,
      delimiter,
    } = options;
    const pathLiteral = _escapeSQLSingleQuotedString(csvPath);
    const parts: string[] = [
      `auto_detect=${autoDetect}`,
      `encoding='utf-8'`,
      `strict_mode=false`,
      `null_padding=true`,
      `parallel=false`,
    ];
    if (header !== undefined) {
      parts.push(`header=${header}`);
    }
    if (skip !== undefined) {
      parts.push(`skip=${skip}`);
    }
    if (delimiter !== undefined) {
      parts.push(`delim='${_escapeSQLSingleQuotedString(delimiter)}'`);
    }
    if (columns !== undefined && columns.length > 0) {
      const columnMap = columns
        .map((col) => {
          return (
            `'${_escapeSQLSingleQuotedString(col.name)}': ` +
            `'${_escapeSQLSingleQuotedString(col.type)}'`
          );
        })
        .join(", ");
      parts.push(`columns={${columnMap}}`);
    }
    const readCsvArgs = parts.join(", ");
    const viewIdent = _quoteIdentifier(viewName);
    const sql =
      `CREATE OR REPLACE VIEW ${viewIdent} AS ` +
      `SELECT * FROM read_csv('${pathLiteral}', ${readCsvArgs});`;
    await _connectionExec(this.#connection, sql);
  }

  /**
   * Writes a table or view to a temporary Parquet file with ZSTD compression
   * and returns the file bytes.
   */
  async exportTableOrViewAsZSTDParquetBlob(
    tableOrViewName: string,
  ): Promise<Uint8Array> {
    const tmpDir = await mkdtemp(join(tmpdir(), "node-duckdb-"));
    const outName = `${randomUUID()}.parquet`;
    const outPath = join(tmpDir, outName);
    const outLiteral = _escapeSQLSingleQuotedString(outPath);
    const relIdent = _quoteIdentifier(tableOrViewName);
    const copySQL =
      `COPY ${relIdent} TO '${outLiteral}' ` +
      `(FORMAT PARQUET, COMPRESSION ZSTD);`;
    try {
      await _connectionExec(this.#connection, copySQL);
      const fileBytes = await readFile(outPath);
      return new Uint8Array(fileBytes);
    } finally {
      await rm(tmpDir, { force: true, recursive: true });
    }
  }

  /**
   * Row count, column names, and DuckDB `DESCRIBE` column types for a Parquet
   * file on disk.
   */
  async summarizeParquetFile(parquetPath: string): Promise<{
    rowCount: number;
    columnNames: readonly string[];
    /** Parallel `column_type` strings from `DESCRIBE`. */
    columnTypeDescriptions: readonly string[];
  }> {
    const escaped = _escapeSQLSingleQuotedString(parquetPath);
    const countRows = await this.runRawQuery<{ c: bigint | number }>(
      `SELECT COUNT(*)::BIGINT AS c FROM read_parquet('${escaped}')`,
    );
    const describeRows = await this.runRawQuery<{
      column_name: string;
      column_type: string;
    }>(`DESCRIBE SELECT * FROM read_parquet('${escaped}')`);
    const firstCount = countRows[0]?.c;
    const rowCount =
      typeof firstCount === "bigint" ?
        Number(firstCount)
      : Number(firstCount ?? 0);
    const columnNames = describeRows.map((row) => {
      return row.column_name;
    });
    const columnTypeDescriptions = describeRows.map((row) => {
      return row.column_type;
    });
    return { rowCount, columnNames, columnTypeDescriptions };
  }

  /**
   * Closes the connection and database handle.
   */
  async close(): Promise<void> {
    await _connectionClose(this.#connection);
    await _databaseClose(this.#db);
  }
}
