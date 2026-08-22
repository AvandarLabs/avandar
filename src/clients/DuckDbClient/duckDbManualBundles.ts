import type { DuckDBBundles } from "@duckdb/duckdb-wasm";

import ehWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import mvpWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import duckDbWasmEh from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import duckDbWasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";

/**
 * Vite-resolved DuckDB-WASM bundles for `selectBundle`.
 *
 * We intentionally omit the COI (pthread) bundle: even with COEP, runtime
 * `LOAD` of extensions from `extensions.duckdb.org/wasm_threads/*` fails with
 * a shared-memory LinkError. The EH bundle loads the compatible extension
 * builds and covers CSV / XLSX / parquet import without COEP.
 */
export function buildManualDuckDbBundles(): DuckDBBundles {
  return {
    mvp: {
      mainModule: duckDbWasm,
      mainWorker: mvpWorker,
    },
    eh: {
      mainModule: duckDbWasmEh,
      mainWorker: ehWorker,
    },
  };
}
