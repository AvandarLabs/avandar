import * as duck from "@duckdb/duckdb-wasm";
import ehWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import mvpWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import duckDBWasmEh from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import duckDBWasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import { invariant } from "@tanstack/react-router";
import * as arrow from "apache-arrow";
import knex from "knex";
import { match } from "ts-pattern";
import { Logger } from "@/lib/Logger";
import { MIMEType, UnknownDataFrame } from "@/lib/types/common";
import { makeObjectFromList } from "@/lib/utils/objects/builders";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { objectEntries } from "@/lib/utils/objects/misc";
import { promiseMap } from "@/lib/utils/promises";
import { DatasetId, DatasetWithColumns } from "@/models/datasets/Dataset";
import { DatasetColumn } from "@/models/datasets/DatasetColumn";
import { getArrowDataType } from "@/models/datasets/DatasetColumn/utils";
import { unparseDataset } from "@/models/LocalDataset/utils";
import { DatasetClient } from "./datsets/DatasetClient";
import { DatasetRawDataClient } from "./datsets/DatasetRawDataClient";

export type QueryAggregationType =
  | "sum"
  | "avg"
  | "count"
  | "max"
  | "min"
  | "none";

export type LocalQueryConfig = {
  datasetId: DatasetId;
  selectFields: readonly DatasetColumn[];
  groupByFields: readonly DatasetColumn[];
  orderByColumn?: DatasetColumn | undefined;
  orderByDirection?: "asc" | "desc";

  /**
   * Aggregations to apply to the selected fields.
   * Key is the field name. Value is the type of aggregation.
   */
  aggregations: Record<string, QueryAggregationType>;
};

export type QueryResultField = {
  name: string;
  dataType: "string" | "number" | "date";
};

export type LocalQueryResultData = {
  fields: QueryResultField[];
  data: UnknownDataFrame;
};

function arrowFieldToQueryResultField(
  field: arrow.Field<arrow.DataType>,
): QueryResultField {
  return {
    name: field.name,
    dataType: match(field.type.typeId)
      .with(arrow.Type.Date, arrow.Type.TimestampMillisecond, () => {
        return "date" as const;
      })
      .with(
        arrow.Type.Float,
        arrow.Type.Float16,
        arrow.Type.Float32,
        arrow.Type.Float64,
        arrow.Type.Int,
        arrow.Type.Int16,
        arrow.Type.Int32,
        arrow.Type.Int64,
        () => {
          return "number" as const;
        },
      )
      .otherwise(() => {
        return "string" as const;
      }),
  };
}

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

function datasetIdToTableName(datasetId: DatasetId): string {
  return `dataset_${datasetId}`;
}

/**
 * Client for running queries on local datasets.
 */
class LocalDatasetQueryClientImpl {
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

  async #getDataset(datasetId: DatasetId): Promise<DatasetWithColumns> {
    const dataset = await DatasetClient.getWithColumns({ id: datasetId });
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

  async getTableNames(): Promise<string[]> {
    return await this.#withConnection(async ({ conn }) => {
      // get all table names
      const result = await conn.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'main' AND table_type = 'BASE TABLE'
      `);
      const tableNames: string[] = result.toArray().map((row) => {
        return row.table_name;
      });
      return tableNames;
    });
  }

  async dropAllTables(): Promise<void> {
    return await this.#withConnection(async ({ db, conn }) => {
      const tableNames = await this.getTableNames();
      await promiseMap(tableNames, async (tableName) => {
        await conn.query(`DROP TABLE IF EXISTS "${tableName}"`);
        await db.dropFile(tableName);
      });
    });
  }

  /**
   * Loads a dataset into the database. If the dataset already exists in the db
   * then we will skip loading it again.
   *
   * @param datasetId The ID of the dataset to load.
   * @returns A promise that resolves when the dataset is loaded.
   */
  async loadDataset(datasetId: DatasetId): Promise<void> {
    const { columns } = await this.#getDataset(datasetId);
    const parsedRawData = await DatasetRawDataClient.getParsedRawData({
      datasetId,
    });
    invariant(parsedRawData, "Raw data could not be found.");

    const tableName = datasetIdToTableName(datasetId);

    // first verify the table name doesn't already exist
    const existingTableNames = await this.getTableNames();
    if (existingTableNames.includes(tableName)) {
      // table name already exists, so we can skip loading the dataset again
      return;
    }

    await this.#withConnection(async ({ db, conn }) => {
      // make sure all date columns are in ISO format so that they can be
      // parsed by duckdb
      const dateColumns = columns.filter((column) => {
        return column.dataType === "date";
      });

      // mutable operations for performance reasons here
      parsedRawData.forEach((row) => {
        dateColumns.forEach((column) => {
          const dateString = row[column.name];
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          row[column.name] =
            dateString ? new Date(dateString).toISOString() : undefined;
        });
      });

      // register the dataset in the database as a file
      const rawStringData = unparseDataset({
        datasetType: MIMEType.TEXT_CSV,
        data: parsedRawData,
      });
      await db.registerFileText(tableName, rawStringData);

      // insert the dataset as its own table
      const arrowColumns = columns.map((column) => {
        return {
          name: column.name,
          dataType: getArrowDataType(column.dataType),
        };
      });

      await conn.insertCSVFromPath(tableName, {
        name: tableName,
        schema: "main",
        detect: true,
        header: true,
        delimiter: ",",
        columns: makeObjectFromList(arrowColumns, {
          keyFn: getProp("name"),
          valueFn: getProp("dataType"),
        }),
      });
    });
  }

  async runQuery({
    selectFields,
    groupByFields,
    aggregations,
    datasetId,
    orderByColumn,
    orderByDirection,
  }: LocalQueryConfig): Promise<LocalQueryResultData> {
    const selectFieldNames = selectFields.map(getProp("name"));
    const groupByFieldNames = groupByFields.map(getProp("name"));

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

      if (orderByColumn && orderByDirection) {
        query = query.orderBy(orderByColumn.name, orderByDirection);
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

        const jsDataRows = results.toArray().map((row) => {
          return row.toJSON();
        });

        return {
          fields: results.schema.fields.map(arrowFieldToQueryResultField),
          data: jsDataRows,
        };
      } catch (error) {
        Logger.error(error, { query: query.toString() });
        throw error;
      }
    });
  }
}

export const LocalDatasetQueryClient = new LocalDatasetQueryClientImpl();
