import { DatasetDuckDbCoordinator } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import {
  getRelationSources,
  probeRelationCache,
} from "@/clients/qetl/QueryMediator/getRelationSources";
import {
  fetchRelationBytes,
  loadRelationBytes,
} from "@/clients/qetl/QueryMediator/relationLoading";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type {
  QetlRunnerOptions,
  QetlRunQuery,
  RunLeasedQueryOptions,
  RunQetlQueryOptions,
} from "@/clients/qetl/QueryMediator/QueryMediator.types";
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
  const missingDice = await probeRelationCache(queryOptions.queryDependencies);
  const relationSources = await getRelationSources(missingDice);
  const fetchedRelationBytes = await fetchRelationBytes({
    relationSources,
    datasetDuckDbLease: queryOptions.datasetDuckDbLease,
    runQuery: options.runQuery,
  });
  await loadRelationBytes({
    relations: fetchedRelationBytes,
    datasetDuckDbLease: queryOptions.datasetDuckDbLease,
    insertToStorageCache: runnerOptions.insertToStorageCache,
  });
  const duckDbQueryOptions = {
    datasetDuckDbLease: queryOptions.datasetDuckDbLease,
    datasetTableReadMode: runnerOptions.duckDbReadMode,
    publicSnapshotDuckDbOwner: runnerOptions.publicSnapshotDuckDbOwner,
    signal: queryOptions.signal,
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
  options.queryOptions.signal?.throwIfAborted();
  const queryDependencies = await options.runnerOptions.getQueryDependencies(
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
          signal: options.queryOptions.signal,
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
