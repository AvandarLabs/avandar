import { makeIdLookupRecord, makeObject, prop } from "@avandar/utils";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { QueryableRelationColumns } from "@/clients/qetl/QueryMediator/QueryableRelationColumns/QueryableRelationColumns";
import { readRelationCsv } from "@/clients/qetl/QueryMediator/relationLoading/readRelationCsv/readRelationCsv";
import { createDefaultRegistry } from "@/clients/qetl/wrappers/createDefaultRegistry";
import { DuckDbSqlAnalyzer } from "@/lib/sql/DuckDbSqlAnalyzer/DuckDbSqlAnalyzer";
import type { RelationCsvReader } from "$/models/relations/SourceWrapper/SourceWrapper.types";
import type { DatasetDuckDbLease } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type {
  QetlRunQuery,
  RelationFetchedListener,
  RelationSource,
} from "@/clients/qetl/QueryMediator/QueryMediator.types";
import type { RelationRegistry } from "@/clients/qetl/RelationRegistry/RelationRegistry";

/**
 * Narrows a relation source to the `virtual` arm, the only one carrying a
 * defining SQL. A plain boolean predicate does not narrow a discriminated
 * union, so this has to be a type guard rather than `propEq`.
 */
function _isVirtualRelationSource(
  relationSource: Readonly<RelationSource>,
): relationSource is Extract<RelationSource, { sourceType: "virtual" }> {
  return relationSource.sourceType === "virtual";
}

function _lookupsForFetch(relationSources: readonly RelationSource[]) {
  return {
    datasetsById: makeIdLookupRecord(relationSources.map(prop("dataset"))),
    rawSqlByDatasetId: makeObject(
      relationSources.filter(_isVirtualRelationSource),
      {
        keyFn: prop("dataset.id"),
        valueFn: prop("sourceDataset.rawSql"),
      },
    ),
  };
}

function _leaseBoundTranscoders(datasetDuckDbLease: DatasetDuckDbLease) {
  return {
    readRelationCsv: async (params: Parameters<RelationCsvReader>[0]) => {
      return await readRelationCsv({ ...params, datasetDuckDbLease });
    },
    mergeParquetParts: async (partBlobs: readonly Blob[]) => {
      return await DuckDbClient.mergeParquetBlobs({
        parquetBlobs: partBlobs,
        datasetDuckDbLease,
      });
    },
  };
}

/**
 * Builds the relation registry one query's fetch uses, pre-wired against the
 * dataset records and per-source-type lookups that fetch already resolved.
 *
 * Each dataset's own source type picks which wrapper handles it; this is the
 * one place that wiring is assembled, so a new source type is added here and
 * nowhere else in the fetch path.
 */
/** Throws `message` when `value` is missing, instead of returning it. */
function _getOrThrow<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message);
  }
  return value;
}

/**
 * When the rows a nested query read go stale: the earliest stale-at time of
 * the datasets its SQL names, as the queryable tier recorded them while the
 * query loaded them. SQL the analyzer cannot read names none.
 */
function _getDependencyStaleAt(rawSql: string): number | undefined {
  try {
    return QueryableRelationColumns.getEarliestStaleAt(
      DuckDbSqlAnalyzer.getReadDatasetIdsFromSql(rawSql),
    );
  } catch {
    return undefined;
  }
}

export function createRegistryForFetch(
  options: Readonly<{
    relationSources: readonly RelationSource[];
    datasetDuckDbLease: DatasetDuckDbLease;
    runQuery: QetlRunQuery;
    onRelationFetched?: RelationFetchedListener;
  }>,
): RelationRegistry {
  const lookups = _lookupsForFetch(options.relationSources);
  return createDefaultRegistry({
    ..._leaseBoundTranscoders(options.datasetDuckDbLease),
    getRawSql: async (ref) => {
      return _getOrThrow(
        lookups.rawSqlByDatasetId[ref.id],
        `Virtual dataset '${ref.id}' is not among the relations to fetch`,
      );
    },
    getDataset: async (id) => {
      return _getOrThrow(
        lookups.datasetsById[id],
        `Dataset '${id}' is not among the relations to fetch`,
      );
    },
    runParquetQuery: async ({ rawSql }) => {
      // The caller's spine restrictions apply only to the outer statement's
      // concepts and must not reach this nested query: its bytes are cached in
      // the relation cache under a key that ignores them.
      const parquetBlob = await options.runQuery({
        rawSql,
        returnType: "parquet",
        datasetDuckDbLease: options.datasetDuckDbLease,
        // The nested query's datasets are part of the outer query's work,
        // so they report through the same callback.
        onRelationFetched: options.onRelationFetched,
      });
      return { parquetBlob, staleAt: _getDependencyStaleAt(rawSql) };
    },
  });
}
