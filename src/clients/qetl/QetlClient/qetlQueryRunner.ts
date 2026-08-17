import { DatasetDuckDbCoordinator } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import {
  getDiceExtractors,
  getMissingDice,
} from "@/clients/qetl/QetlClient/qetlDiceExtractors";
import {
  fetchDiceFacts,
  loadDiceFacts,
} from "@/clients/qetl/QetlClient/qetlFactLoading";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type {
  QetlRunnerOptions,
  QetlRunQuery,
  RunLeasedQueryOptions,
  RunQetlQueryOptions,
} from "@/clients/qetl/QetlClient/QetlClient.types";
import type { UnknownObject } from "@avandar/utils";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";

async function _runLeasedQuery<RowObject extends UnknownObject>(
  options: Readonly<{
    runnerOptions: QetlRunnerOptions;
    queryOptions: RunLeasedQueryOptions;
    runQuery: QetlRunQuery;
  }>,
): Promise<Blob | QueryResult.T<RowObject>> {
  const { runnerOptions, queryOptions } = options;
  await runnerOptions.prepareDuckDbDatasets?.({
    datasetIds: queryOptions.queryDependencies,
    datasetDuckDbLease: queryOptions.datasetDuckDbLease,
  });
  const missingDice = await getMissingDice(queryOptions.queryDependencies);
  const extractors = await getDiceExtractors(missingDice);
  const fetchedFacts = await fetchDiceFacts({
    extractors,
    datasetDuckDbLease: queryOptions.datasetDuckDbLease,
    runQuery: options.runQuery,
  });
  await loadDiceFacts({
    facts: fetchedFacts,
    datasetDuckDbLease: queryOptions.datasetDuckDbLease,
    insertToStorageCache: runnerOptions.insertToStorageCache,
  });
  const duckDbQueryOptions = {
    datasetDuckDbLease: queryOptions.datasetDuckDbLease,
    datasetTableReadMode: runnerOptions.duckDbReadMode,
    publicSnapshotDuckDbOwner: runnerOptions.publicSnapshotDuckDbOwner,
  };
  return queryOptions.returnType === "parquet" ?
      DuckDbClient.runRawQuery(queryOptions.rawSql, {
        ...duckDbQueryOptions,
        returnType: "parquet",
      })
    : DuckDbClient.runRawQuery<RowObject>(
        queryOptions.rawSql,
        duckDbQueryOptions,
      );
}

async function _runQuery<RowObject extends UnknownObject = UnknownRow>(
  options: Readonly<{
    runnerOptions: QetlRunnerOptions;
    queryOptions: RunQetlQueryOptions;
    runQuery: QetlRunQuery;
  }>,
): Promise<Blob | QueryResult.T<RowObject>> {
  const queryDependencies = await options.runnerOptions.getDiceFromSql(
    options.queryOptions.rawSql,
  );
  const leaseDatasetIds =
    options.queryOptions.datasetDuckDbLease ?
      queryDependencies
    : ((await options.runnerOptions.getDuckDbLeaseDatasetIds?.(
        queryDependencies,
      )) ?? queryDependencies);
  return DatasetDuckDbCoordinator.runCoordinatedDatasetDuckDbOperation({
    datasetIds: leaseDatasetIds,
    lease: options.queryOptions.datasetDuckDbLease,
    operation: (datasetDuckDbLease) => {
      return _runLeasedQuery<RowObject>({
        runnerOptions: options.runnerOptions,
        runQuery: options.runQuery,
        queryOptions: {
          datasetDuckDbLease,
          queryDependencies,
          rawSql: options.queryOptions.rawSql,
          returnType: options.queryOptions.returnType ?? "js",
        },
      });
    },
  });
}

/** Builds the `runQuery` a Qetl client exposes from its runner policy. */
export function createQetlQueryRunner(
  runnerOptions: Readonly<QetlRunnerOptions>,
): QetlRunQuery {
  const runQuery = (queryOptions: Readonly<RunQetlQueryOptions>) => {
    return _runQuery({ runnerOptions, queryOptions, runQuery });
  };
  return runQuery as QetlRunQuery;
}
