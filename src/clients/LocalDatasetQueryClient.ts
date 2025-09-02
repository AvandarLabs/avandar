import * as duck from "@duckdb/duckdb-wasm";
import ehWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import mvpWorker from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import duckDBWasmEh from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import duckDBWasm from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import { invariant } from "@tanstack/react-router";
import * as arrow from "apache-arrow";
import knex from "knex";
import { match } from "ts-pattern";
import { MIMEType, UnknownDataFrame } from "@/lib/types/common";
import { makeObjectFromList } from "@/lib/utils/objects/builders";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { promiseMap } from "@/lib/utils/promises";
import { DatasetId, DatasetWithColumns } from "@/models/datasets/Dataset";
import { DatasetColumn } from "@/models/datasets/DatasetColumn";
import { getArrowDataType } from "@/models/datasets/DatasetColumn/utils";
import { unparseDataset } from "@/models/LocalDataset/utils";
import { DatasetClient } from "./datasets/DatasetClient";
import { DatasetRawDataClient } from "./datasets/DatasetRawDataClient";

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

// Track in-flight dataset loads so we don't double-load and race.
const __LOADS = new Map<string, Promise<void>>();

// Monotonic sequence for runQuery responses (helps ignore late results).
const __RUNQUERY_SEQ = 0;

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

  async #getActualColumnNames(
    conn: duck.AsyncDuckDBConnection,
    tableName: string,
  ): Promise<string[]> {
    const pragma = await conn.query(
      `PRAGMA table_info("${tableName.replace(/"/g, '""')}")`,
    );
    return pragma.toArray().map((r) => {
      return r.name;
    });
  }

  #makeResolver(actualNames: string[]): (name: string) => string {
    const normalize = (s: string) => {
      return s
        .replace(/\u00A0/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
    };

    const map = new Map(
      actualNames.map((n) => {
        return [normalize(n), n];
      }),
    );

    return (uiName: string) => {
      const n = normalize(uiName);
      const resolved = map.get(n);
      if (resolved) return resolved;
      if (actualNames.includes(uiName)) return uiName;
      throw new Error(
        `Unable to resolve column "${uiName}". Known: ${actualNames.join(", ")}`,
      );
    };
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
    // If a load for this dataset is already running, await it.
    const existing = __LOADS.get(datasetId);
    if (existing) {
      await existing;
      return;
    }

    const loadPromise = (async () => {
      const { columns } = await this.#getDataset(datasetId);
      const parsedRawData = await DatasetRawDataClient.getParsedRawData({
        datasetId,
      });
      invariant(parsedRawData, "Raw data could not be found.");

      const tableName = datasetIdToTableName(datasetId);

      // Fast skip if the table is already present
      const existingTableNames = await this.getTableNames();
      if (existingTableNames.includes(tableName)) return;

      await this.#withConnection(async ({ db, conn }) => {
        // Normalize date columns to ISO
        const dateColumns = columns.filter((c) => {
          return c.dataType === "date";
        });
        parsedRawData.forEach((row) => {
          dateColumns.forEach((col) => {
            const dateString = row[col.name] as unknown as string | undefined;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            row[col.name] =
              dateString ? new Date(dateString).toISOString() : undefined;
          });
        });

        // Register + create table
        const rawStringData = unparseDataset({
          datasetType: MIMEType.TEXT_CSV,
          data: parsedRawData,
        });
        await db.registerFileText(tableName, rawStringData);
        if (rawStringData?.[0]) {
          console.log("🧠 CSV Headers:", Object.keys(rawStringData[0]));
        } else {
          console.warn("⚠️ rawStringData[0] is undefined");
        }
        console.log(rawStringData);
        const arrowColumns = columns.map((c) => {
          return {
            name: c.name,
            dataType: getArrowDataType(c.dataType),
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
    })();

    __LOADS.set(datasetId, loadPromise);
    try {
      await loadPromise;
    } finally {
      __LOADS.delete(datasetId);
    }
  }

  #buildAggregationClause({
    uiName,
    aggType,
    resolveActual,
    isMoneyishUI,
    moneyLikeToDoubleSql,
    aliasCanonical,
    q,
  }: {
    uiName: string;
    aggType: QueryAggregationType;
    resolveActual: (name: string) => string;
    isMoneyishUI: (name: string) => boolean;
    moneyLikeToDoubleSql: (qExpr: string) => string;
    aliasCanonical: (name: string) => string;
    q: (name: string) => string;
  }): string | null {
    const actual = resolveActual(uiName);
    const alias = aliasCanonical(uiName);
    const needsNumeric = ["sum", "avg", "min", "max"].includes(aggType);
    const expr =
      needsNumeric && isMoneyishUI(uiName) ?
        moneyLikeToDoubleSql(q(actual))
      : q(actual);

    return match(aggType)
      .with("count", () => {
        return `COUNT(${q(actual)}) AS ${q(alias)}`;
      })
      .with("sum", () => {
        return `ROUND(SUM(${expr}), 2) AS ${q(alias)}`;
      })
      .with("avg", () => {
        return `ROUND(AVG(${expr}), 2) AS ${q(alias)}`;
      })
      .with("max", () => {
        return `ROUND(MAX(${expr}), 2) AS ${q(alias)}`;
      })
      .with("min", () => {
        return `ROUND(MIN(${expr}), 2) AS ${q(alias)}`;
      })
      .otherwise(() => {
        return null;
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
    const tableName = datasetIdToTableName(datasetId);
    const uiSelectNames = selectFields.map((c) => {
      return c.name;
    });
    const uiGroupByNames = groupByFields.map((c) => {
      return c.name;
    });

    return this.#withConnection(async ({ conn }) => {
      const actualNames = await this.#getActualColumnNames(conn, tableName);
      const resolveActual = this.#makeResolver(actualNames);
      const normalize = (s: string) => {
        return s
          .replace(/\u00A0/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();
      };
      const aliasCanonical = (s: string) => {
        return s
          .replace(/\u00A0/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      };

      const aggOf = (uiName: string): QueryAggregationType => {
        return aggregations?.[uiName] ?? "none";
      };

      const q = (ident: string) => {
        return `"${ident.replace(/"/g, '""')}"`;
      };

      const isMoneyishUI = (uiName: string) => {
        const n = normalize(uiName).replace(/[^a-z]/g, "");
        return /(cost|price|amount|total|oop|charge|median|est)/.test(n);
      };

      const moneyLikeToDoubleSql = (qa: string) => {
        return `
(
  CASE
    WHEN ${qa} IS NULL THEN NULL
    ELSE
      (CASE WHEN ${qa} LIKE '%(%)%' THEN -1 ELSE 1 END)
      * TRY_CAST(NULLIF(regexp_replace(TRIM(${qa}), '[^0-9.+-]', ''), '') AS DOUBLE)
  END
)`;
      };

      // ─── Determine Column Modes ────────────────────────────────
      const uiAggPairs = uiSelectNames.map((n) => {
        return [n, aggOf(n)] as const;
      });
      const aggregatedUI = uiAggPairs
        .filter(([, a]) => {
          return a !== "none";
        })
        .map(([n]) => {
          return n;
        });
      const nonAggregatedUI = uiAggPairs
        .filter(([, a]) => {
          return a === "none";
        })
        .map(([n]) => {
          return n;
        });
      const hasAnyAgg = aggregatedUI.length > 0;
      const hasExplicitGroupBy = uiGroupByNames.length > 0;

      // ─── Begin Query Construction ──────────────────────────────
      let query = sql.from(tableName);

      if (!hasAnyAgg && !hasExplicitGroupBy) {
        // ➤ DETAIL MODE (no agg, no group by)
        for (const uiName of uiSelectNames) {
          const actual = resolveActual(uiName);
          const expr =
            isMoneyishUI(uiName) ? moneyLikeToDoubleSql(q(actual)) : q(actual);
          const alias = aliasCanonical(uiName);
          query = query.select(sql.raw(`${expr} AS ${q(alias)}`));
        }
      } else if (hasExplicitGroupBy) {
        // ➤ GROUP BY MODE
        const groupByTargetsUI = Array.from(
          new Set([...uiGroupByNames, ...nonAggregatedUI]),
        );

        for (const uiName of groupByTargetsUI) {
          const actual = resolveActual(uiName);
          const expr =
            isMoneyishUI(uiName) ? moneyLikeToDoubleSql(q(actual)) : q(actual);
          const alias = aliasCanonical(uiName);
          query = query.select(sql.raw(`${expr} AS ${q(alias)}`));
        }

        for (const uiName of aggregatedUI) {
          const aggClause = this.#buildAggregationClause({
            uiName,
            aggType: aggOf(uiName),
            resolveActual,
            isMoneyishUI,
            moneyLikeToDoubleSql,
            aliasCanonical,
            q,
          });
          if (aggClause) query = query.select(sql.raw(aggClause));
        }

        if (groupByTargetsUI.length > 0) {
          query = query.groupByRaw(
            groupByTargetsUI
              .map((ui) => {
                return q(resolveActual(ui));
              })
              .join(", "),
          );
        }
      } else {
        // ➤ SINGLE-ROW SUMMARY MODE
        for (const uiName of aggregatedUI) {
          const aggClause = this.#buildAggregationClause({
            uiName,
            aggType: aggOf(uiName),
            resolveActual,
            isMoneyishUI,
            moneyLikeToDoubleSql,
            aliasCanonical,
            q,
          });
          if (aggClause) query = query.select(sql.raw(aggClause));
        }
      }

      if (orderByColumn && orderByDirection) {
        query = query.orderByRaw(
          `${q(resolveActual(orderByColumn.name))} ${orderByDirection}`,
        );
      }

      // ─── Execute Query ─────────────────────────────────────────
      const results = await conn.query<Record<string, arrow.DataType>>(
        query.toString(),
      );

      const schemaNames = results.schema.fields
        .map((f) => {
          return f.name;
        })
        .filter((n) => {
          return n !== "__noop__";
        });

      const jsDataRows = results.toArray().map((row) => {
        const o = row.toJSON() as Record<string, unknown>;
        const out: Record<string, unknown> = {};
        for (const name of schemaNames) {
          const v = o[name];
          out[name] = typeof v === "bigint" ? Number(v) : v;
        }
        return out;
      });

      const fields = results.schema.fields
        .filter((f) => {
          return f.name !== "__noop__";
        })
        .map(arrowFieldToQueryResultField);

      return { fields, data: jsDataRows };
    });
  }
}

export const LocalDatasetQueryClient = new LocalDatasetQueryClientImpl();
