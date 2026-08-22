import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { PublicSnapshotDuckDbOwner } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient.types";
import type {
  DuckDbClientOperations,
  RawQueryOptions,
} from "@/clients/DuckDbClient/duckDbClientOperations";
import type * as duckdb from "@duckdb/duckdb-wasm";

import { MIMEType } from "@avandar/utils";
import * as arrow from "apache-arrow";

import { uuid } from "$/lib/uuid";
import { abortDuckDbQuery } from "@/clients/DuckDbClient/abortDuckDbQuery/abortDuckDbQuery";
import { DatasetDuckDbCoordinator } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import { arrowTableToJS } from "@/clients/DuckDbClient/duckDbArrowResults";
import { TRUSTED_INTERNAL_SQL } from "@/clients/DuckDbClient/duckDbClientOperations";
import {
  getQueryStringFromParams,
  mergeDuckDbDatasetIds,
} from "@/clients/DuckDbClient/duckDbSqlText";
import { DuckDbSqlAnalyzer } from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer";

type RawQueryExecutionPlan = {
  datasetIds: string[];
  mutatedDatasetIds: string[];
  publicSnapshotDuckDbOwner: PublicSnapshotDuckDbOwner | undefined;
  readDatasetIds: string[];
};

function _getRawQueryExecutionPlan(
  input: Readonly<{ options: RawQueryOptions; queryStringToUse: string }>,
): RawQueryExecutionPlan {
  const { options, queryStringToUse } = input;
  const analysis =
    DuckDbSqlAnalyzer.getDuckDbSqlAnalysisFromSql(queryStringToUse);
  const isTrustedInternalSql =
    options.datasetTableReadMode !== "public" &&
    options[TRUSTED_INTERNAL_SQL] === true &&
    analysis.kind === "unsafe" &&
    analysis.reason === "uninspectable-source";
  if (analysis.kind === "unsafe" && !isTrustedInternalSql) {
    throw new Error(`Cannot safely execute DuckDB SQL: ${analysis.reason}`);
  }
  if (options.datasetTableReadMode === "public" && analysis.kind !== "read") {
    throw new Error("Public DuckDB queries must be read-only");
  }
  const publicSnapshotDuckDbOwner = options.publicSnapshotDuckDbOwner;
  if (
    options.datasetTableReadMode === "public" &&
    publicSnapshotDuckDbOwner === undefined
  ) {
    throw new Error("Public DuckDB queries require an expected snapshot owner");
  }
  // A read analysis names relations of every kind, so only the datasets among
  // them are dataset tables this plan has to prepare.
  const readDatasetIds =
    analysis.kind === "mutating"
      ? analysis.readDatasetIds
      : analysis.kind === "read"
        ? analysis.relations.flatMap((relation) => {
            return relation.kind === "dataset" ? [relation.id] : [];
          })
        : analysis.datasetIds;
  const mutatedDatasetIds =
    analysis.kind === "mutating" ? analysis.mutatedDatasetIds : [];
  const datasetIds = mergeDuckDbDatasetIds(readDatasetIds, mutatedDatasetIds);
  return {
    datasetIds,
    mutatedDatasetIds,
    publicSnapshotDuckDbOwner,
    readDatasetIds,
  };
}

function _prepareRawQueryDatasetTables(
  input: Readonly<{ options: RawQueryOptions; plan: RawQueryExecutionPlan }>,
): void {
  const { options, plan } = input;
  if (options.datasetTableReadMode === "public") {
    if (plan.publicSnapshotDuckDbOwner === undefined) {
      throw new Error(
        "Public DuckDB queries require an expected snapshot owner",
      );
    }
    DatasetDuckDbCoordinator.assertPublicSnapshotDatasetOwners({
      datasetIds: plan.readDatasetIds,
      owner: plan.publicSnapshotDuckDbOwner,
    });
  } else {
    DatasetDuckDbCoordinator.assertWorkspaceDatasetTables(plan.readDatasetIds);
  }
  plan.mutatedDatasetIds.forEach(
    DatasetDuckDbCoordinator.markDatasetDuckDbTableInvalid,
  );
}

async function _executeRawQuery<RowObject extends UnknownRow>(
  input: Readonly<{
    client: DuckDbClientOperations;
    options: RawQueryOptions;
    queryString: string;
    queryStringToUse: string;
  }>,
): Promise<Blob | QueryResult.T<RowObject>> {
  const { client, options, queryString, queryStringToUse } = input;
  const conn = options.conn ?? (await client.connect());
  const removeAbortListener = options.signal
    ? abortDuckDbQuery({ signal: options.signal, connection: conn })
    : () => {
        return undefined;
      };
  try {
    client.logger.log("Executing query", { query: queryStringToUse });
    if ((options.returnType ?? "js") === "js") {
      const arrowTable =
        await conn.query<Record<string, arrow.DataType>>(queryStringToUse);
      return arrowTableToJS<RowObject>(arrowTable, { logger: client.logger });
    }
    const tempViewName = uuid();
    await conn.query(
      `CREATE TEMP VIEW "${tempViewName}" AS ${queryStringToUse}`,
    );
    return await client.exportTableAsParquet(tempViewName, conn);
  } catch (error) {
    client.logger.error(error, {
      executedQueryString: queryStringToUse,
      templatedQueryString: queryString,
    });
    throw error;
  } finally {
    removeAbortListener();
    if (conn !== options.conn) {
      await client.closeConnection(conn);
    }
  }
}

/**
 * Runs raw SQL under the dataset leases its static analysis proves it needs.
 *
 * @param options.client The client operations to run the query through.
 * @param options.queryString The templated query to run.
 * @param options.options The caller's raw query options.
 */
export async function runDuckDbRawQuery<RowObject extends UnknownRow>(
  input: Readonly<{
    client: DuckDbClientOperations;
    options: RawQueryOptions;
    queryString: string;
  }>,
): Promise<Blob | QueryResult.T<RowObject>> {
  const { client, options, queryString } = input;
  const queryStringToUse = getQueryStringFromParams({
    queryString,
    params: options.params ?? {},
  });
  const plan = _getRawQueryExecutionPlan({ queryStringToUse, options });
  return await DatasetDuckDbCoordinator.runCoordinatedDatasetDuckDbOperation({
    datasetIds: plan.datasetIds,
    lease: options.datasetDuckDbLease,
    operation: async () => {
      _prepareRawQueryDatasetTables({ options, plan });
      return await _executeRawQuery<RowObject>({
        client,
        options,
        queryString,
        queryStringToUse,
      });
    },
  });
}

/**
 * Exports a table or view as a Parquet file using ZSTD compression (default).
 *
 * "Exporting" means that we turn it into a blob (a binary object).
 *
 * @param options.client The client operations to run the export through.
 * @param options.tableOrViewName The name of the table or view to export as a
 * Parquet blob.
 * @param options.conn An existing connection to reuse, if any.
 */
export async function exportDuckDbTableAsParquet(
  options: Readonly<{
    client: DuckDbClientOperations;
    tableOrViewName: string;
    conn?: duckdb.AsyncDuckDBConnection;
  }>,
): Promise<Blob> {
  const { client, conn, tableOrViewName } = options;
  try {
    const db = await client.getDb();
    const tempParquetFileName = `${tableOrViewName}.temp`;
    await client.runRawQuery(
      `COPY '$tableName$' TO '$parquetFileName$' (
          FORMAT 'parquet',
          COMPRESSION 'ZSTD'
        )`,
      {
        conn,
        params: {
          tableName: tableOrViewName,
          parquetFileName: tempParquetFileName,
        },
      },
    );

    const parquetBuffer = (await db.copyFileToBuffer(
      tempParquetFileName,
    )) as Uint8Array<ArrayBuffer>;

    const parquetBlob = new Blob([parquetBuffer], {
      type: MIMEType.APPLICATION_PARQUET,
    });

    await db.dropFile(tempParquetFileName);
    return parquetBlob;
  } catch (error) {
    // drop the view so it's not left behind
    await conn?.query(`DROP VIEW IF EXISTS "${tableOrViewName}"`);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    client.logger.error(error, {
      msg: "Failed to export table as parquet (ZSTD)",
      errMsg: errorMessage,
    });
    throw new Error(`Parquet export failed: ${errorMessage}`);
  }
}
