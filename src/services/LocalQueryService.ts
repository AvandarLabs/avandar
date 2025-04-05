import * as duck from "@duckdb/duckdb-wasm";
import ehWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import mvpWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import duckDBWasmEh from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import duckDBWasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import * as arrow from "apache-arrow";

const MANUAL_BUNDLES: duck.DuckDBBundles = {
  mvp: {
    mainModule: duckDBWasm,
    mainWorker: mvpWorker,
  },
  eh: {
    mainModule: duckDBWasmEh,
    mainWorker: ehWorker,
  },
};

class LocalQueryServiceImpl {
  #db?: Promise<duck.AsyncDuckDB>;

  async initialize(): Promise<duck.AsyncDuckDB> {
    // Select a bundle based on browser checks
    const bundle = await duck.selectBundle(MANUAL_BUNDLES);

    // Instantiate the asynchronous version of DuckDB-wasm
    const worker = new Worker(bundle.mainWorker!);
    const logger = new duck.ConsoleLogger();
    const duckdb = new duck.AsyncDuckDB(logger, worker);

    await duckdb.instantiate(bundle.mainModule, bundle.pthreadWorker);
    return duckdb;
  }

  async getDB(): Promise<duck.AsyncDuckDB> {
    if (!this.#db) {
      this.#db = this.initialize();
    }
    return this.#db;
  }

  async loadCSVData() {
    // load test data
    const db = await this.getDB();
    const conn = await db.connect();
    await db.registerFileText(`data.csv`, "rowNum|val\n1|foo\n2|bar\n");
    await conn.insertCSVFromPath("data.csv", {
      schema: "main",
      name: "foo",
      detect: false,
      header: true,
      delimiter: "|",
      columns: {
        rowNum: new arrow.Int32(),
        val: new arrow.Utf8(),
      },
    });
    conn.close();
  }

  async queryData() {
    const db = await this.getDB();
    const conn = await db.connect();
    const results = await conn.query<{ rowNum: arrow.Int32; val: arrow.Utf8 }>(`
    select * from foo
  `);
    conn.close();
    return results.toArray().map((row) => {
      console.log(row);
      return row.toJSON();
    });
  }
}

export const LocalQueryService = new LocalQueryServiceImpl();
