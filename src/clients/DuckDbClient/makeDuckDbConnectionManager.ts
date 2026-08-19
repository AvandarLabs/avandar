import * as duckdb from "@duckdb/duckdb-wasm";
import { buildManualDuckDbBundles } from "@/clients/DuckDbClient/duckDbManualBundles";
import { shouldLoadDuckDbNetworkExtensions } from "@/clients/DuckDbClient/shouldLoadDuckDbNetworkExtensions";
import { FeatureFlag, isFlagEnabled } from "@/config/FeatureFlagConfig";
import type { DuckDbSpatialAvailabilityStore } from "@/clients/DuckDbClient/DuckDbSpatialAvailability/DuckDbSpatialAvailability";
import type { ILogger } from "@avandar/logger";

/** Lazily starts DuckDB-WASM and tracks the connections handed out. */
export type DuckDbConnectionManager = {
  /** Closes a connection and stops tracking it. */
  closeConnection: (conn: duckdb.AsyncDuckDBConnection) => Promise<void>;
  /** Opens a tracked connection to the shared database. */
  connect: () => Promise<duckdb.AsyncDuckDBConnection>;
  /** Returns the shared database, starting it on first use. */
  getDb: () => Promise<duckdb.AsyncDuckDB>;
  /**
   * Tracking open connections. This is useful for debugging if we ever need to
   * know if we forgot to close any connections.
   */
  openConnections: Set<duckdb.AsyncDuckDBConnection>;
};

function _formatDuckDbWorkerError(event: ErrorEvent): string {
  if (event.message) {
    return event.message;
  }
  if (event.error instanceof Error && event.error.message) {
    return event.error.message;
  }
  const details: string[] = [];
  if (event.filename) {
    details.push(`worker script: ${event.filename}`);
  }
  if (event.lineno > 0) {
    details.push(`line ${event.lineno}`);
  }
  if (event.colno > 0) {
    details.push(`column ${event.colno}`);
  }
  if (details.length > 0) {
    return `DuckDB worker failed to start (${details.join(", ")})`;
  }
  return "DuckDB worker failed to start";
}

/**
 * DuckDB-WASM clears pending requests on worker `error` without rejecting
 * `instantiate()`, which leaves dataset imports spinning forever.
 */
function _waitForDuckDbWorkerFailure(worker: Worker): Promise<never> {
  return new Promise((_resolve, reject) => {
    worker.addEventListener(
      "error",
      (event: ErrorEvent) => {
        reject(
          new Error(
            `${_formatDuckDbWorkerError(event)}. ` +
              "If this persists after a hard refresh, restart the dev server.",
          ),
        );
      },
      { once: true },
    );
    worker.addEventListener(
      "messageerror",
      () => {
        reject(
          new Error(
            "DuckDB worker failed to start (message deserialization error). " +
              "If this persists after a hard refresh, restart the dev server.",
          ),
        );
      },
      { once: true },
    );
  });
}

async function _disposeDuckDbInstance(
  db: duckdb.AsyncDuckDB,
  worker: Worker,
): Promise<void> {
  worker.terminate();
  await db.terminate().catch(() => {});
}

async function _loadDuckDbExtensions(
  options: Readonly<{
    conn: duckdb.AsyncDuckDBConnection;
    hasPthreadWorker: boolean;
    logger: ILogger;
    spatialAvailability: DuckDbSpatialAvailabilityStore;
  }>,
): Promise<void> {
  const { conn, logger } = options;
  const loadNetworkExtensions = shouldLoadDuckDbNetworkExtensions({
    isDisableDuckDbSpatialFlagEnabled: isFlagEnabled(
      FeatureFlag.DisableDuckDbSpatial,
    ),
    hasPthreadWorker: options.hasPthreadWorker,
  });

  // Spatial / excel are fetched from `extensions.duckdb.org` on each fresh
  // AsyncDuckDB init (DuckDb-WASM does not persist extensions across page
  // loads). When offline, both fetches throw; we let init succeed without
  // them so the bulk of the app (parquet queries) still works. Geo or
  // .xlsx flows hit a runtime "unknown function/format" error instead of
  // breaking the whole client.
  // TODO(jpsyx): only load spatial when a geo query needs it.
  const loadOptionalExtension = async (name: string): Promise<boolean> => {
    try {
      await conn.query(`LOAD ${name};`);
      return true;
    } catch (error) {
      logger.warn(
        `DuckDB extension "${name}" failed to load (likely offline); ` +
          "queries that need it will fail.",
        { error },
      );
      return false;
    }
  };
  const didLoadSpatial =
    loadNetworkExtensions && (await loadOptionalExtension("spatial"));
  options.spatialAvailability.set(didLoadSpatial ? "available" : "unavailable");
  await conn.query("LOAD parquet;");
  if (loadNetworkExtensions) {
    await loadOptionalExtension("excel");
  }
}

async function _initializeDuckDb(options: {
  logger: ILogger;
  spatialAvailability: DuckDbSpatialAvailabilityStore;
}): Promise<duckdb.AsyncDuckDB> {
  const { logger, spatialAvailability } = options;
  const bundle = await duckdb.selectBundle(buildManualDuckDbBundles());

  const worker = new Worker(bundle.mainWorker!);
  const duckDbLogger = new duckdb.ConsoleLogger();
  const db = new duckdb.AsyncDuckDB(duckDbLogger, worker);
  try {
    await Promise.race([
      db.instantiate(bundle.mainModule, bundle.pthreadWorker),
      _waitForDuckDbWorkerFailure(worker),
    ]);
  } catch (error) {
    await _disposeDuckDbInstance(db, worker);
    throw error;
  }

  const conn = await db.connect();
  await _loadDuckDbExtensions({
    conn,
    hasPthreadWorker: bundle.pthreadWorker != null,
    logger,
    spatialAvailability,
  });
  await conn.close();

  return db;
}

/** Creates the lazily started DuckDB instance and its connection tracker. */
export function makeDuckDbConnectionManager(options: {
  logger: ILogger;
  spatialAvailability: DuckDbSpatialAvailabilityStore;
}): DuckDbConnectionManager {
  const { logger, spatialAvailability } = options;
  const openConnections = new Set<duckdb.AsyncDuckDBConnection>();
  let dbPromise: Promise<duckdb.AsyncDuckDB> | undefined;

  const getDb = async (): Promise<duckdb.AsyncDuckDB> => {
    if (!dbPromise) {
      dbPromise = _initializeDuckDb({ logger, spatialAvailability }).catch(
        (error: unknown) => {
          dbPromise = undefined;
          spatialAvailability.set("unavailable");
          throw error;
        },
      );
    }
    return dbPromise;
  };

  return {
    closeConnection: async (conn) => {
      openConnections.delete(conn);
      await conn.close();
    },
    connect: async () => {
      const db = await getDb();
      const conn = await db.connect();
      openConnections.add(conn);
      return conn;
    },
    getDb,
    openConnections,
  };
}
