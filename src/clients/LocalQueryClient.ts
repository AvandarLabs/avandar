import * as duck from "@duckdb/duckdb-wasm";
import ehWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import mvpWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import duckDBWasmEh from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import duckDBWasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import * as arrow from "apache-arrow";
import * as R from "remeda";
import * as LocalDataset from "@/models/LocalDataset";
import { LocalDatasetClient } from "./LocalDatasetClient";

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

function datasetIdToTableName(datasetId: number): string {
  return `dataset_${datasetId}`;
}

class LocalQueryClientImpl {
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

  async #getDataset(datasetId: number): Promise<LocalDataset.T> {
    const dataset = await LocalDatasetClient.getDataset(datasetId);
    if (!dataset) {
      throw new Error(`Dataset ${datasetId} not found`);
    }
    return dataset;
  }

  async #withConnection<T>(
    operationFn: (params: {
      db: duck.AsyncDuckDB;
      conn: duck.AsyncDuckDBConnection;
    }) => Promise<T>,
  ): Promise<T> {
    const db = await this.getDB();
    const conn = await db.connect();
    try {
      return await operationFn({ db, conn });
    } finally {
      await conn.close();
    }
  }

  /*
  async #loadCSVData() {
    // load test data
    await this.#withConnection(async ({ db, conn }) => {
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
    });
  }
  */

  async loadDataset(datasetId: number) {
    const { data, fields } = await this.#getDataset(datasetId);
    const tableName = datasetIdToTableName(datasetId);

    return await this.#withConnection(async ({ db, conn }) => {
      // register the dataset in the database as a file
      await db.registerFileText(tableName, data);

      // insert the dataset as its own table
      const arrowColumns = fields.map((fieldSchema: LocalDataset.Field) => {
        return {
          name: fieldSchema.name,
          // TODO(pablo): this should be coming from the fieldSchema's
          // `dataType`
          dataType: new arrow.Utf8(),
        };
      });

      await conn.insertCSVFromPath(tableName, {
        name: tableName,
        schema: "main",
        detect: false,
        header: true,
        delimiter: ",",
        columns: R.pullObject(arrowColumns, R.prop("name"), R.prop("dataType")),
      });
    });
  }

  async queryData(datasetId: number) {
    const tableName = datasetIdToTableName(datasetId);
    return this.#withConnection(async ({ conn }) => {
      const results = await conn.query<Record<string, arrow.DataType>>(`
        select * from ${tableName}
      `);
      return results.toArray().map((row) => {
        return row.toJSON();
      });
    });
  }
}

export const LocalQueryClient = new LocalQueryClientImpl();
