import * as duck from "@duckdb/duckdb-wasm";
import ehWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import mvpWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import duckDBWasmEh from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import duckDBWasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import * as arrow from "apache-arrow";
import knex from "knex";
import { match } from "ts-pattern";
import { Logger } from "@/lib/utils/Logger";
import {
  getProp,
  makeObjectFromList,
  objectEntries,
} from "@/lib/utils/objects";
import * as LocalDataset from "@/models/LocalDataset";
import { LocalDatasetClient } from "./LocalDatasetClient";

export type AggregationType = "sum" | "avg" | "count" | "max" | "min" | "none";
export type LocalQueryConfig = {
  datasetId: number;
  selectFieldNames: string[];
  groupByFieldNames: string[];

  /**
   * Aggregations to apply to the selected fields.
   * Key is the field name. Value is the type of aggregation.
   */
  aggregations: Record<string, AggregationType>;
};

const sql = knex({
  client: "sqlite3",
  wrapIdentifier: (value: string) => {
    return `"${value.replace(/"/g, '""')}"`;
  },
  useNullAsDefault: true,
});

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

/**
 * Client for running queries on local datasets.
 */
class LocalQueryClientImpl {
  #db?: Promise<duck.AsyncDuckDB>;

  async #initialize(): Promise<duck.AsyncDuckDB> {
    // Select a bundle based on browser checks
    const bundle = await duck.selectBundle(MANUAL_BUNDLES);

    // Instantiate the asynchronous version of DuckDB-wasm
    const worker = new Worker(bundle.mainWorker!);
    const logger = new duck.ConsoleLogger();
    const duckdb = new duck.AsyncDuckDB(logger, worker);

    await duckdb.instantiate(bundle.mainModule, bundle.pthreadWorker);
    return duckdb;
  }

  async #getDB(): Promise<duck.AsyncDuckDB> {
    if (!this.#db) {
      this.#db = this.#initialize();
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

  /**
   * Runs a database operation with a connection. Wrap any operation
   * that requires a connection in this method so that the connection
   * is properly closed after the operation.
   * @param operationFn The function to run with the connection.
   * @param operationFn.params - The argument the `operationFn` receives.
   * @param operationFn.params.db - The database instance.
   * @param operationFn.params.conn - The connection instance.
   * @returns The result of the operation.
   */
  async #withConnection<T>(
    operationFn: (params: {
      db: duck.AsyncDuckDB;
      conn: duck.AsyncDuckDBConnection;
    }) => Promise<T>,
  ): Promise<T> {
    const db = await this.#getDB();
    const conn = await db.connect();
    try {
      return await operationFn({ db, conn });
    } finally {
      await conn.close();
    }
  }

  async loadDataset(datasetId: number): Promise<void> {
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
        columns: makeObjectFromList({
          inputList: arrowColumns,
          keyFn: getProp("name"),
          valueFn: getProp("dataType"),
        }),
      });
    });
  }

  async runQuery({
    selectFieldNames,
    groupByFieldNames,
    aggregations,
    datasetId,
  }: LocalQueryConfig): Promise<Array<Record<string, unknown>>> {
    const tableName = datasetIdToTableName(datasetId);

    return this.#withConnection(async ({ conn }) => {
      const fieldNamesWithoutAggregations = selectFieldNames.filter(
        (fieldName) => {
          return aggregations[fieldName] === "none";
        },
      );

      // build the query
      let query = sql.select(...fieldNamesWithoutAggregations).from(tableName);
      if (groupByFieldNames.length > 0) {
        query = query.groupBy(...groupByFieldNames);
      }

      // apply aggregations
      query = objectEntries(aggregations).reduce(
        (newQuery, [fieldName, aggType]) => {
          return match(aggType)
            .with("sum", () => {
              return query.sum(fieldName);
            })
            .with("avg", () => {
              return query.avg(fieldName);
            })
            .with("count", () => {
              return query.count(fieldName);
            })
            .with("max", () => {
              return query.max(fieldName);
            })
            .with("min", () => {
              return query.min(fieldName);
            })
            .with("none", () => {
              return newQuery;
            })
            .exhaustive(() => {
              return newQuery;
            });
        },
        query,
      );

      // run the query
      try {
        const results = await conn.query<Record<string, arrow.DataType>>(
          query.toString(),
        );

        return results.toArray().map((row) => {
          return row.toJSON();
        });
      } catch (error) {
        Logger.error(error, { query: query.toString() });
        throw error;
      }
    });
  }
}

export const LocalQueryClient = new LocalQueryClientImpl();
