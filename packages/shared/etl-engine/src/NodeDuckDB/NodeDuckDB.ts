import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import duckdb from "duckdb";

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

function _escapeSqlSingleQuotedString(value: string): string {
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

export type NodeDuckDBReadCsvColumn = Readonly<{
  name: string;
  /** DuckDB type, e.g. `VARCHAR`, `BIGINT`, `DOUBLE`, `TIMESTAMP`. */
  type: string;
}>;

export type NodeDuckDBReadCsvIntoViewOptions = Readonly<{
  /** Absolute or relative path to the CSV file on disk. */
  csvPath: string;
  /** Name of the view to create in the `main` schema. */
  viewName: string;
  /**
   * When set, passed to `read_csv` as `columns={...}`; when omitted, types are
   * inferred (`auto_detect` applies).
   */
  columns?: readonly NodeDuckDBReadCsvColumn[];
  autoDetect?: boolean;
  header?: boolean;
  skip?: number;
  delimiter?: string;
}>;

/**
 * Thin Node.js wrapper around the `duckdb` native bindings: raw SQL, CSV
 * views, and ZSTD Parquet export.
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
   * Creates or replaces a view that reads a CSV via `read_csv`.
   */
  async readCsvIntoView(
    options: NodeDuckDBReadCsvIntoViewOptions,
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
    const pathLiteral = _escapeSqlSingleQuotedString(csvPath);
    const parts: string[] = [`auto_detect=${autoDetect}`, `encoding='utf-8'`];
    if (header !== undefined) {
      parts.push(`header=${header}`);
    }
    if (skip !== undefined) {
      parts.push(`skip=${skip}`);
    }
    if (delimiter !== undefined) {
      parts.push(`delim='${_escapeSqlSingleQuotedString(delimiter)}'`);
    }
    if (columns !== undefined && columns.length > 0) {
      const columnMap = columns
        .map((col) => {
          return (
            `'${_escapeSqlSingleQuotedString(col.name)}': ` +
            `'${_escapeSqlSingleQuotedString(col.type)}'`
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
  async exportTableOrViewAsZstdParquetBlob(
    tableOrViewName: string,
  ): Promise<Uint8Array> {
    const tmpDir = await mkdtemp(join(tmpdir(), "node-duckdb-"));
    const outName = `${randomUUID()}.parquet`;
    const outPath = join(tmpDir, outName);
    const outLiteral = _escapeSqlSingleQuotedString(outPath);
    const relIdent = _quoteIdentifier(tableOrViewName);
    const copySql =
      `COPY ${relIdent} TO '${outLiteral}' ` +
      `(FORMAT PARQUET, COMPRESSION ZSTD);`;
    try {
      await _connectionExec(this.#connection, copySql);
      const fileBytes = await readFile(outPath);
      return new Uint8Array(fileBytes);
    } finally {
      await rm(tmpDir, { force: true, recursive: true });
    }
  }

  /**
   * Closes the connection and database handle.
   */
  async close(): Promise<void> {
    await _connectionClose(this.#connection);
    await _databaseClose(this.#db);
  }
}
