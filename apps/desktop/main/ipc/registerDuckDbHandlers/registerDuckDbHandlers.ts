import type { DuckDbService } from "../../services/createDuckDbService/createDuckDbService";
import type { IpcServer } from "../createIpcServer/createIpcServer";

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

import { DuckDbContracts } from "../../../../../shared/platform/ipc/contracts/DuckDbContracts";
import { getUserDataDir } from "../../platform/getUserDataDir";

/*
 * Path layout in `loadFromSourcePath` / `loadParquetFromDatasetBlobStore`
 * is a stopgap. Soon, the canonical
 * `workspaces/<wsId>/datasets/<dsId>/data.parquet` layout will arrive
 * with the `FileSystemDatasetBlobStore`, and these handlers will rebase
 * on that store. Keeping the path concerns local to this file makes the
 * follow-up edit a single grep.
 */

function _parquetPathForDataset(datasetId: string): string {
  return join(getUserDataDir(), "datasets", datasetId, "data.parquet");
}

function _ensureParentDirExists(filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
}

/*
 * DuckDB allows non-letters in identifiers when quoted, but the IPC layer
 * synthesises view names from `datasetId` which we treat as opaque. Scrub
 * to a SQL-safe ascii subset so the generated `create view ds_<id>` is
 * unambiguous and predictable in error logs.
 */
function _safeTableName(datasetId: string): string {
  return `ds_${datasetId.replace(/[^a-z0-9_]/gi, "_")}`;
}

/*
 * DuckDB does not bind `?` for path arguments inside COPY ... TO,
 * read_csv_auto(...), read_parquet(...), or read_xlsx(...). Escape and
 * inline as a single-quoted string literal. All call sites only pass paths
 * the Bun-main process has already validated (canonical dataset paths or
 * filesystem paths the user picked through a native dialog), so the
 * escape boundary is "untrusted-quote-char in a trusted path", not
 * arbitrary user SQL.
 */
function _sqlPathLiteral(path: string): string {
  return `'${path.replaceAll("'", "''")}'`;
}

/**
 * Registers the `duckdb.runRawQuery`,
 * `duckdb.loadParquetFromDatasetBlobStore`, and `duckdb.loadFromSourcePath`
 * IPC handlers on `server`, bound to the given native DuckDB service. The
 * webview's `DesktopDuckDbClient` calls these via `callIpc` to run
 * analytical SQL against the desktop's on-disk DuckDB file.
 *
 * The handlers treat all `params` as positional prepared-statement
 * bindings; they never interpolate user input into the SQL string. Native
 * DuckDB errors propagate back to the caller through the reply envelope.
 *
 * @param ipcServer - Server returned by `createIpcServer`.
 * @param duckDbService - Native DuckDB service from `createDuckDbService`.
 */
export function registerDuckDbHandlers(
  ipcServer: IpcServer,
  duckDbService: DuckDbService,
): void {
  ipcServer.handle(DuckDbContracts.runRawQuery, async (req) => {
    const rows = await duckDbService.runRawQuery<Record<string, unknown>>(
      req.sql,
      req.params,
    );
    return { rows };
  });

  ipcServer.handle(
    DuckDbContracts.loadParquetFromDatasetBlobStore,
    async (req) => {
      const parquetPath = _parquetPathForDataset(req.datasetId);
      const tableName = _safeTableName(req.datasetId);
      await duckDbService.runRawQuery(
        `create or replace view ${tableName} as
         select * from read_parquet(${_sqlPathLiteral(parquetPath)})`,
        [],
      );
      return { tableName };
    },
  );

  ipcServer.handle(DuckDbContracts.loadFromSourcePath, async (req) => {
    const parquetPath = _parquetPathForDataset(req.datasetId);
    _ensureParentDirExists(parquetPath);
    const srcLit = _sqlPathLiteral(req.sourcePath);
    const dstLit = _sqlPathLiteral(parquetPath);

    const countParquetRows = async (): Promise<number> => {
      const counted = await duckDbService.runRawQuery<{
        count: bigint | number;
      }>(`select count(*) as count from read_parquet(${dstLit})`, []);
      return Number(counted[0]?.count ?? 0);
    };

    if (req.format === "csv") {
      await duckDbService.runRawQuery(
        `copy (select * from read_csv_auto(${srcLit}))
         to ${dstLit} (format parquet)`,
        [],
      );
    } else if (req.format === "xlsx") {
      /*
       * `read_xlsx` lives in the `excel` community extension. Install
       * and load are idempotent; doing it at every call is cheap and
       * means the binding boots cleanly even on a fresh DuckDB file.
       */
      await duckDbService.runRawQuery(`install excel; load excel;`, []);
      await duckDbService.runRawQuery(
        `copy (select * from read_xlsx(${srcLit}))
         to ${dstLit} (format parquet)`,
        [],
      );
    } else if (req.format === "parquet") {
      await duckDbService.runRawQuery(
        `copy (select * from read_parquet(${srcLit}))
         to ${dstLit} (format parquet)`,
        [],
      );
    } else {
      throw new Error(`Unsupported format: ${String(req.format)}`);
    }

    return {
      datasetId: req.datasetId,
      rowCount: await countParquetRows(),
      parquetBlobKey: parquetPath,
    };
  });
}
