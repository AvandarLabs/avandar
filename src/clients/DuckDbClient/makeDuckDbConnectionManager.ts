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
  /**
   * Loads DuckDB Spatial if it is not loaded yet, and reports whether GIS
   * queries can run. Safe to call on every render: the fetch happens once.
   */
  ensureSpatial: () => Promise<boolean>;
  /** Loads the `excel` extension `read_xlsx` needs. Fetched once. */
  ensureExcel: () => Promise<boolean>;
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

/**
 * Loads what every query needs, and nothing that only some do.
 *
 * `parquet` is unconditional because every dataset is parquet. Do not add
 * `spatial` or `excel` here: each is fetched from `extensions.duckdb.org` on
 * **every** fresh AsyncDuckDB init, since DuckDB-WASM cannot persist
 * extensions across page loads and the CDN sends no `cache-control`, so
 * loading them here costs every page load ~1.2s and ~6.2MB over the wire
 * (~23MB once decompressed) of third-party traffic for capabilities most
 * sessions never use, and puts that CDN in the critical path of opening any
 * dataset at all. They load through `ensureExtension` at the point of use:
 * see `ensureSpatial` and `ensureExcel`.
 */
async function _loadRequiredDuckDbExtensions(
  conn: duckdb.AsyncDuckDBConnection,
): Promise<void> {
  await conn.query("LOAD parquet;");
}

async function _initializeDuckDb(
  onBundleSelected: (hasPthreadWorker: boolean) => void,
): Promise<duckdb.AsyncDuckDB> {
  const bundle = await duckdb.selectBundle(buildManualDuckDbBundles());
  onBundleSelected(bundle.pthreadWorker != null);

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
  await _loadRequiredDuckDbExtensions(conn);
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
  let hasPthreadWorker = false;
  const extensionPromises = new Map<string, Promise<boolean>>();

  const getDb = async (): Promise<duckdb.AsyncDuckDB> => {
    if (!dbPromise) {
      dbPromise = _initializeDuckDb((selectedHasPthreadWorker) => {
        hasPthreadWorker = selectedHasPthreadWorker;
      }).catch((error: unknown) => {
        dbPromise = undefined;
        spatialAvailability.set("unavailable");
        throw error;
      });
    }
    return dbPromise;
  };

  /**
   * Loads one optional extension, once per page load.
   *
   * The promise is memoized rather than the boolean so concurrent callers
   * share a single fetch instead of racing four of them; a failure is
   * memoized too, because a fetch that failed offline will fail again and
   * retrying it per call would stall every caller in turn.
   */
  const ensureExtension = (name: string): Promise<boolean> => {
    const existing = extensionPromises.get(name);
    if (existing) {
      return existing;
    }
    const loading = (async (): Promise<boolean> => {
      const db = await getDb();
      if (
        !shouldLoadDuckDbNetworkExtensions({
          isDisableDuckDbSpatialFlagEnabled: isFlagEnabled(
            FeatureFlag.DisableDuckDbSpatial,
          ),
          hasPthreadWorker,
        })
      ) {
        return false;
      }
      const conn = await db.connect();
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
      } finally {
        await conn.close();
      }
    })();
    extensionPromises.set(name, loading);
    return loading;
  };

  return {
    ensureExcel: () => {
      return ensureExtension("excel");
    },
    ensureSpatial: async () => {
      const isAvailable = await ensureExtension("spatial");
      spatialAvailability.set(isAvailable ? "available" : "unavailable");
      return isAvailable;
    },
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
