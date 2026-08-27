import { makeBucketRecord, where } from "@avandar/utils";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { DatasetDuckDbCoordinator } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { loadConceptRelations } from "@/clients/qetl/QueryMediator/conceptRelation/loadConceptRelations";
import { getConceptSpineTableNameFromRef } from "@/clients/qetl/QueryMediator/conceptRelation/loadConceptSpine/loadConceptSpine";
import { expandRelationRefs } from "@/clients/qetl/QueryMediator/expandRelationRefs/expandRelationRefs";
import { getNeededColumnsFromQuery } from "@/clients/qetl/QueryMediator/getNeededColumnsFromQuery/getNeededColumnsFromQuery";
import { getParquetColumnNamesFromNeeded } from "@/clients/qetl/QueryMediator/getParquetColumnNamesFromNeeded/getParquetColumnNamesFromNeeded";
import {
  getRelationSources,
  probeRelationCache,
} from "@/clients/qetl/QueryMediator/getRelationSources";
import {
  fetchRelationBytes,
  loadRelationBytes,
  probeStorageRelationCache,
} from "@/clients/qetl/QueryMediator/relationLoading";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { ConceptRelationPlan } from "@/clients/qetl/QueryMediator/conceptRelation/conceptRelation.types";
import type {
  NeededColumnsByDatasetId,
  QetlRunnerOptions,
  QetlRunQuery,
  RunLeasedQueryOptions,
  RunQetlQueryOptions,
} from "@/clients/qetl/QueryMediator/QueryMediator.types";
import type { UnknownObject } from "@avandar/utils";

function _hasFiniteColumnSet(
  neededByDatasetId: NeededColumnsByDatasetId,
  datasetIds: readonly Dataset.Id[],
): boolean {
  return datasetIds.some((datasetId) => {
    return (neededByDatasetId[datasetId] ?? "all") !== "all";
  });
}

/**
 * Maps query-facing names to Parquet headers. Skips the column catalog when
 * every dataset already needs `"all"`, so an `"all"` cache hit still costs
 * no extra dataset-column read.
 */
async function _getParquetNeededByDatasetId(
  options: Readonly<{
    datasetIds: readonly Dataset.Id[];
    neededByDatasetId: NeededColumnsByDatasetId;
  }>,
): Promise<NeededColumnsByDatasetId> {
  if (!_hasFiniteColumnSet(options.neededByDatasetId, options.datasetIds)) {
    return options.neededByDatasetId;
  }
  const columns = await DatasetColumnClient.withCache(AvaQueryClient)
    .withEnsureQueryData()
    .getAll(where("dataset_id", "in", options.datasetIds));
  const columnsByDatasetId = makeBucketRecord(columns, { key: "datasetId" });
  return Object.fromEntries(
    options.datasetIds.map((datasetId) => {
      return [
        datasetId,
        getParquetColumnNamesFromNeeded({
          datasetColumns: columnsByDatasetId[datasetId] ?? [],
          needed: options.neededByDatasetId[datasetId] ?? "all",
        }),
      ];
    }),
  );
}

async function _getNeededParquetColumnsForQuery(
  queryOptions: RunLeasedQueryOptions,
): Promise<NeededColumnsByDatasetId> {
  const inferred = getNeededColumnsFromQuery({
    conceptRelations: queryOptions.conceptRelations,
    datasetIds: queryOptions.queryDependencies,
    rawSql: queryOptions.rawSql,
  });
  return _getParquetNeededByDatasetId({
    datasetIds: queryOptions.queryDependencies,
    // A caller-stated set replaces inference for the datasets it names, and
    // only those. Inference reads a select list, which a `CREATE TABLE AS
    // SELECT` does not expose, so without an override that shape always
    // acquires `"all"`.
    neededByDatasetId: {
      ...inferred,
      ...queryOptions.neededColumnsByDatasetId,
    },
  });
}

/**
 * Loads each query dataset into DuckDB from the queryable tier, the storage
 * tier, or a source acquire, using the columns the query needs.
 *
 * An empty uncached list skips `getRelationSources`, which does not
 * short-circuit on its own.
 */
async function _loadQueryRelations(
  options: Readonly<{
    queryOptions: RunLeasedQueryOptions;
    runQuery: QetlRunQuery;
    runnerOptions: QetlRunnerOptions;
  }>,
): Promise<void> {
  const { queryOptions, runnerOptions } = options;
  const neededByDatasetId =
    await _getNeededParquetColumnsForQuery(queryOptions);
  const notInQueryableTier = await probeRelationCache(
    queryOptions.queryDependencies,
    neededByDatasetId,
  );
  const { cachedRelations, growFromColumnsByDatasetId, uncachedDatasetIds } =
    await probeStorageRelationCache({
      datasetIds: notInQueryableTier,
      neededByDatasetId,
      principalKey: runnerOptions.principalKey,
      relationCache: runnerOptions.relationCache,
    });
  const relationSources =
    uncachedDatasetIds.length > 0
      ? await getRelationSources(uncachedDatasetIds)
      : [];
  const fetchedRelationBytes = await fetchRelationBytes({
    datasetDuckDbLease: queryOptions.datasetDuckDbLease,
    growFromColumnsByDatasetId,
    neededByDatasetId,
    relationSources,
    runQuery: options.runQuery,
  });
  await loadRelationBytes({
    datasetDuckDbLease: queryOptions.datasetDuckDbLease,
    principalKey: runnerOptions.principalKey,
    relationCache: runnerOptions.relationCache,
    relations: cachedRelations.concat(fetchedRelationBytes),
    relationsToStore: fetchedRelationBytes,
  });
}

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
  await _loadQueryRelations(options);
  // Strictly after the datasets: a concept's view reads their `ava_rows_`
  // views, and DuckDB binds a view's sources when it is defined.
  await loadConceptRelations({
    conceptRelations: queryOptions.conceptRelations,
    datasetDuckDbLease: queryOptions.datasetDuckDbLease,
  });
  const duckDbQueryOptions = {
    datasetDuckDbLease: queryOptions.datasetDuckDbLease,
    datasetTableReadMode: runnerOptions.duckDbReadMode,
    publicSnapshotDuckDbOwner: runnerOptions.publicSnapshotDuckDbOwner,
    signal: queryOptions.signal,
  };
  return queryOptions.returnType === "parquet"
    ? DuckDbClient.runRawQuery(queryOptions.rawSql, {
        ...duckDbQueryOptions,
        returnType: "parquet",
      })
    : DuckDbClient.runRawQuery<RowObject>(
        queryOptions.rawSql,
        duckDbQueryOptions,
      );
}

/**
 * Every dataset the query must load: the ones it names, plus every dataset a
 * concept it names contributes from.
 *
 * The union runs through `expandRelationRefs` rather than a bare concat so the
 * result is sorted and de-duplicated, which is what lets it be hashed into a
 * cache key later. The session's own answer is kept as the dataset half because
 * that answer is the workspace allowlist: this must widen the set with
 * contributors the session already authorized, never with anything it did not.
 */
function _getExpandedQueryDependencies(
  options: Readonly<{
    datasetIds: readonly Dataset.Id[];
    conceptRelations: readonly ConceptRelationPlan[];
  }>,
): Dataset.Id[] {
  return expandRelationRefs({
    refs: options.datasetIds.map((id) => {
      return { kind: "dataset", id } as const;
    }),
    conceptRelations: options.conceptRelations,
  }).flatMap((ref) => {
    // Only the datasets: a concept relation is built rather than loaded, so it
    // is not a dependency the dataset machinery below can act on.
    return ref.kind === "dataset" ? [ref.id] : [];
  });
}

/**
 * The names a query's lease must cover.
 *
 * A concept's spine is a DuckDB table like any other, and `loadCsv` coordinates
 * on the table name it is handed, so the spine's name has to be in the lease or
 * the load is refused as insufficiently leased. Its concept view needs no
 * entry: `CREATE OR REPLACE VIEW` names no dataset, so its own coordination set
 * is empty.
 *
 * Known limitation, and it fails loudly rather than quietly: a nested
 * virtual-dataset query that names a concept the outer query does not will be
 * refused, because the outer lease was taken before that concept was known. No
 * demo path reaches it, and the error names the lease rather than corrupting a
 * relation.
 */
function _getLeaseNames(
  options: Readonly<{
    datasetIds: readonly Dataset.Id[];
    conceptRelations: readonly ConceptRelationPlan[];
  }>,
): string[] {
  return [
    ...options.datasetIds,
    ...options.conceptRelations.map((plan) => {
      return getConceptSpineTableNameFromRef(plan.ref);
    }),
  ];
}

async function _runQuery<RowObject extends UnknownObject = UnknownRow>(
  options: Readonly<{
    runnerOptions: QetlRunnerOptions;
    queryOptions: RunQetlQueryOptions;
    runQuery: QetlRunQuery;
  }>,
): Promise<Blob | QueryResult.T<RowObject>> {
  options.queryOptions.signal?.throwIfAborted();
  const namedDatasetIds = await options.runnerOptions.getQueryDependencies(
    options.queryOptions.rawSql,
  );
  const conceptRelations =
    (await options.runnerOptions.planConceptRelations?.(
      options.queryOptions.rawSql,
    )) ?? [];
  const queryDependencies = _getExpandedQueryDependencies({
    datasetIds: namedDatasetIds,
    conceptRelations,
  });
  const leaseDatasetIds = options.queryOptions.datasetDuckDbLease
    ? queryDependencies
    : ((await options.runnerOptions.getDuckDbLeaseDatasetIds?.(
        queryDependencies,
      )) ?? queryDependencies);
  return DatasetDuckDbCoordinator.runCoordinatedDatasetDuckDbOperation({
    datasetIds: _getLeaseNames({
      datasetIds: leaseDatasetIds,
      conceptRelations,
    }),
    lease: options.queryOptions.datasetDuckDbLease,
    operation: (datasetDuckDbLease) => {
      return _runLeasedQuery<RowObject>({
        runnerOptions: options.runnerOptions,
        runQuery: options.runQuery,
        queryOptions: {
          datasetDuckDbLease,
          queryDependencies,
          conceptRelations,
          rawSql: options.queryOptions.rawSql,
          returnType: options.queryOptions.returnType ?? "js",
          signal: options.queryOptions.signal,
          neededColumnsByDatasetId:
            options.queryOptions.neededColumnsByDatasetId,
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
