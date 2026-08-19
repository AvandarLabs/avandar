import { DatasetDuckDbCoordinator } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { loadConceptRelations } from "@/clients/qetl/QueryMediator/conceptRelation/loadConceptRelations";
import { getConceptSpineTableNameFromRef } from "@/clients/qetl/QueryMediator/conceptRelation/loadConceptSpine/loadConceptSpine";
import { expandRelationRefs } from "@/clients/qetl/QueryMediator/expandRelationRefs/expandRelationRefs";
import {
  getRelationSources,
  probeRelationCache,
} from "@/clients/qetl/QueryMediator/getRelationSources";
import {
  fetchRelationBytes,
  loadRelationBytes,
  probeStorageRelationCache,
} from "@/clients/qetl/QueryMediator/relationLoading";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { ConceptRelationPlan } from "@/clients/qetl/QueryMediator/conceptRelation/conceptRelation.types";
import type {
  QetlRunnerOptions,
  QetlRunQuery,
  RunLeasedQueryOptions,
  RunQetlQueryOptions,
} from "@/clients/qetl/QueryMediator/QueryMediator.types";
import type { UnknownObject } from "@avandar/utils";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
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
  // Two tiers, probed cheapest first, both ahead of source dispatch.
  //
  // The queryable tier is DuckDB itself: a relation already loaded into this
  // tab needs nothing further. The storage tier is the on-disk parquet: a hit
  // there still has to be loaded into DuckDB, but costs no network and no
  // dataset-record read.
  //
  // Only what neither tier can serve reaches `getRelationSources`, which is the
  // first step that cares what kind of source a relation has.
  const notInQueryableTier = await probeRelationCache(
    queryOptions.queryDependencies,
  );
  const { cachedRelations, uncachedDatasetIds } =
    await probeStorageRelationCache({
      datasetIds: notInQueryableTier,
      relationCache: runnerOptions.relationCache,
      principalKey: runnerOptions.principalKey,
    });
  // Guarded here rather than inside `getRelationSources`, which deliberately
  // does not short-circuit on an empty list and is pinned that way by the
  // characterization suite. Before the tiers were probed ahead of dispatch an
  // empty list was rare; now it is the common case, because a fully cached
  // query leaves nothing to dispatch, and every one of those would otherwise
  // pay for a dataset read that can only return nothing.
  const relationSources =
    uncachedDatasetIds.length > 0 ?
      await getRelationSources(uncachedDatasetIds)
    : [];
  const fetchedRelationBytes = await fetchRelationBytes({
    relationSources,
    datasetDuckDbLease: queryOptions.datasetDuckDbLease,
    runQuery: options.runQuery,
  });
  await loadRelationBytes({
    // Everything goes into DuckDB; only what was just acquired is written back
    // to the storage tier, because the rest came out of it.
    relations: cachedRelations.concat(fetchedRelationBytes),
    relationsToStore: fetchedRelationBytes,
    datasetDuckDbLease: queryOptions.datasetDuckDbLease,
    relationCache: runnerOptions.relationCache,
    principalKey: runnerOptions.principalKey,
  });
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
  const leaseDatasetIds =
    options.queryOptions.datasetDuckDbLease ?
      queryDependencies
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
