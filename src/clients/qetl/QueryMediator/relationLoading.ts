import {
  isDefined,
  makeBucketRecord,
  makeIdLookupRecord,
  promiseMap,
  prop,
  where,
} from "@avandar/utils";
import { unionColumnSets } from "$/models/relations/RelationCacheKey/RelationCacheKey";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { DuckDbDataTypeUtils } from "@/clients/DuckDbClient/DuckDbDataType";
import { rememberQueryableColumns } from "@/clients/qetl/QueryMediator/queryableRelationColumns/queryableRelationColumns";
import { getWrapperForRef } from "@/clients/qetl/RelationRegistry/RelationRegistry";
import { createDefaultRegistry } from "@/clients/qetl/wrappers/createDefaultRegistry";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import { Logger } from "@/utils/Logger";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { GoogleSheetsDataset } from "$/models/datasets/GoogleSheetsDataset/GoogleSheetsDataset";
import type {
  PrincipalKey,
  RelationCacheKey,
} from "$/models/relations/RelationCacheKey/RelationCacheKey.types";
import type {
  RelationCachePort,
  RelationCacheProbeHit,
  RelationCacheProbeMiss,
} from "$/models/relations/RelationCachePort/RelationCachePort.types";
import type { DatasetDuckDbLease } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type {
  AcquiredRelationBytes,
  ColumnReplacement,
  NeededColumnsByDatasetId,
  QetlRunQuery,
  RelationSource,
} from "@/clients/qetl/QueryMediator/QueryMediator.types";
import type { RelationRegistry } from "@/clients/qetl/RelationRegistry/RelationRegistry";
import type { ILogger } from "@avandar/logger";

type FetchRelationSourceOptions = {
  relationSource: RelationSource;
  datasetDuckDbLease: DatasetDuckDbLease;
  runQuery: QetlRunQuery;
  relationRegistry: RelationRegistry;
  neededByDatasetId: NeededColumnsByDatasetId;
  growFromColumnsByDatasetId: NeededColumnsByDatasetId;
};

/** Named so wrapper diagnostics are attributable to relation acquisition. */
const _relationLogger: ILogger = Logger.appendName("QetlRelations");

/**
 * Keeps a replacement from naming a column the loaded Parquet does not hold.
 *
 * The replacement clauses become `SELECT * EXCLUDE (…) , … AS …`, and DuckDB
 * binds `EXCLUDE` against the file's real header, so an excluded column that
 * was projected away fails the view's creation outright. Every relation was
 * `"all"` when these clauses were written, so the mismatch could not arise;
 * now that a query can load a subset, the replacements have to be narrowed to
 * that subset too.
 */
function _isColumnInLoadedRelation(
  loadedColumns: readonly string[] | "all",
  column: Readonly<DatasetColumn.T>,
): boolean {
  return (
    loadedColumns === "all" ||
    loadedColumns.includes(column.originalName) ||
    loadedColumns.includes(column.name)
  );
}

function _getColumnReplacements(
  columns: readonly DatasetColumn.T[],
): ColumnReplacement[] {
  return columns
    .map((column) => {
      const hasChangedName = column.name !== column.originalName;
      const hasChangedDataType =
        column.dataType !==
        DuckDbDataTypeUtils.toAvaDataType(column.detectedDataType);
      return hasChangedName || hasChangedDataType
        ? {
            originalName: column.originalName,
            alias: hasChangedName ? column.name : undefined,
            dataType: hasChangedDataType
              ? DuckDbDataTypeUtils.fromDatasetColumnType(column.dataType)
              : undefined,
          }
        : undefined;
    })
    .filter(isDefined);
}

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

function _isGoogleSheetsRelationSource(
  relationSource: Readonly<RelationSource>,
): relationSource is Extract<RelationSource, { sourceType: "google_sheets" }> {
  return relationSource.sourceType === "google_sheets";
}

function _googleSheetsSourceByDatasetId(
  relationSources: readonly RelationSource[],
): Record<string, GoogleSheetsDataset.T> {
  return Object.fromEntries(
    relationSources.filter(_isGoogleSheetsRelationSource).map((source) => {
      return [source.dataset.id, source.sourceDataset];
    }),
  );
}

function _lookupsForFetch(relationSources: readonly RelationSource[]) {
  return {
    datasetsById: makeIdLookupRecord(relationSources.map(prop("dataset"))),
    rawSqlByDatasetId: Object.fromEntries(
      relationSources.filter(_isVirtualRelationSource).map((relationSource) => {
        return [relationSource.dataset.id, relationSource.sourceDataset.rawSql];
      }),
    ),
    googleSheetsByDatasetId: _googleSheetsSourceByDatasetId(relationSources),
  };
}

function _leaseBoundTranscoders(datasetDuckDbLease: DatasetDuckDbLease) {
  return {
    readGoogleSheetTabCsv: async ({
      datasetId,
      csvText,
    }: {
      datasetId: Dataset.Id;
      csvText: string;
    }) => {
      // The same reader the import path uses, so a dataset's columns are typed
      // the same whether the rows arrived at import or at query time.
      const loaded = await DuckDbClient.loadCsv({
        tableName: datasetId,
        fileText: csvText,
        datasetDuckDbLease,
      });
      return { parquetBlob: loaded.parquetData };
    },
    transcodeCsvToParquet: async ({
      datasetId,
      bytes,
    }: {
      datasetId: Dataset.Id;
      bytes: Uint8Array<ArrayBuffer>;
    }) => {
      const loaded = await DuckDbClient.loadCsv({
        tableName: datasetId,
        fileText: new TextDecoder().decode(bytes),
        datasetDuckDbLease,
      });
      return loaded.parquetData;
    },
  };
}

function _createRegistryForFetch(
  options: Readonly<{
    relationSources: readonly RelationSource[];
    datasetDuckDbLease: DatasetDuckDbLease;
    runQuery: QetlRunQuery;
  }>,
): RelationRegistry {
  const lookups = _lookupsForFetch(options.relationSources);
  return createDefaultRegistry({
    ..._leaseBoundTranscoders(options.datasetDuckDbLease),
    getRawSql: async (ref) => {
      const rawSql = lookups.rawSqlByDatasetId[ref.id];
      if (rawSql === undefined) {
        throw new Error(
          `Virtual dataset '${ref.id}' is not among the relations to fetch`,
        );
      }
      return rawSql;
    },
    getDataset: async (id) => {
      const dataset = lookups.datasetsById[id];
      if (!dataset) {
        throw new Error(`Dataset '${id}' is not among the relations to fetch`);
      }
      return dataset;
    },
    getGoogleSheetsSource: async (id) => {
      const source = lookups.googleSheetsByDatasetId[id];
      if (!source) {
        throw new Error(
          `Google Sheets dataset '${id}' is not among the relations to fetch`,
        );
      }
      return source;
    },
    runParquetQuery: ({ rawSql }) => {
      return options.runQuery({
        rawSql,
        returnType: "parquet",
        datasetDuckDbLease: options.datasetDuckDbLease,
      });
    },
  });
}

/**
 * The cache key for one dataset relation under one principal and column set.
 *
 * `definition` and `sourceVersion` are undefined because a plain dataset has
 * no defining text and no freshness token yet.
 */
function _toDatasetCacheKey(
  options: Readonly<{
    columns: readonly string[] | "all";
    datasetId: Dataset.Id;
    principalKey: PrincipalKey;
  }>,
): RelationCacheKey {
  return {
    principal: options.principalKey,
    relation: { kind: "dataset", id: options.datasetId },
    definition: undefined,
    sourceVersion: undefined,
    columns: options.columns,
  };
}

async function _readStorageCacheHit(
  options: Readonly<{
    hit: RelationCacheProbeHit;
    relationCache: RelationCachePort;
  }>,
): Promise<AcquiredRelationBytes | undefined> {
  const payload = await options.relationCache.readPayload(options.hit.entry);
  if (payload === undefined) {
    return undefined;
  }
  await options.relationCache.touch(options.hit.entry.identityKey);
  if (options.hit.key.relation.kind !== "dataset") {
    return undefined;
  }
  return {
    columns: options.hit.entry.columns,
    datasetId: options.hit.key.relation.id,
    parquetBlob: payload,
  };
}

function _toGrowFromColumnsByDatasetId(
  misses: readonly RelationCacheProbeMiss[],
): Record<string, readonly string[] | "all"> {
  return Object.fromEntries(
    misses.flatMap((miss) => {
      return miss.growFrom === undefined
        ? []
        : [[miss.key.relation.id, miss.growFrom.columns]];
    }),
  );
}

function _toStorageProbeKeys(
  options: Readonly<{
    datasetIds: readonly Dataset.Id[];
    neededByDatasetId: NeededColumnsByDatasetId;
    principalKey: PrincipalKey;
  }>,
): RelationCacheKey[] {
  return options.datasetIds.map((datasetId) => {
    return _toDatasetCacheKey({
      columns: options.neededByDatasetId[datasetId] ?? "all",
      datasetId,
      principalKey: options.principalKey,
    });
  });
}

function _makeEmptyStorageProbeResult(): {
  cachedRelations: AcquiredRelationBytes[];
  growFromColumnsByDatasetId: Record<string, readonly string[] | "all">;
  uncachedDatasetIds: Dataset.Id[];
} {
  return {
    cachedRelations: [],
    growFromColumnsByDatasetId: {},
    uncachedDatasetIds: [],
  };
}

/**
 * Splits relations into the ones the storage cache can already serve and the
 * ones that still have to be acquired.
 *
 * **This runs ahead of source dispatch.** A cache hit costs no dataset-record
 * read. A cached relation no longer has to be acquirable to be served: a
 * previously imported Google Sheet whose bytes are already in the storage
 * cache is served from there without a Drive round-trip. Uncached Sheets
 * relations are acquired through `GoogleSheetsWrapper`.
 *
 * **Authorization must already have happened.** Nothing here reads a dataset
 * record, so nothing here can check which workspace a relation belongs to. The
 * ids reaching this function are the ones `getQueryDependencies` returned, and
 * for the workspace session that is `assertWorkspaceRelations`, which refuses a
 * relation outside the workspace rather than dropping it. Serving cached bytes
 * for an unauthorized relation would otherwise be exactly the hole that probe
 * reordering is warned about.
 */
export async function probeStorageRelationCache(
  options: Readonly<{
    datasetIds: readonly Dataset.Id[];
    neededByDatasetId: NeededColumnsByDatasetId;
    relationCache: RelationCachePort;
    principalKey: PrincipalKey;
  }>,
): Promise<{
  cachedRelations: AcquiredRelationBytes[];
  growFromColumnsByDatasetId: Record<string, readonly string[] | "all">;
  uncachedDatasetIds: Dataset.Id[];
}> {
  if (options.datasetIds.length === 0) {
    return _makeEmptyStorageProbeResult();
  }

  const { hits, misses } = await options.relationCache.probe(
    _toStorageProbeKeys(options),
  );

  // A hit is only a hit once its payload is actually readable. Metadata and
  // payload are separate rows, so an interrupted write, or an eviction that
  // removed one but not the other, leaves an entry that probes as servable and
  // reads as nothing. Treating that as a miss re-acquires, instead of handing
  // the query an empty relation.
  const readHits = await promiseMap(hits, (hit) => {
    return _readStorageCacheHit({
      hit,
      relationCache: options.relationCache,
    });
  });
  const cachedRelations = readHits.filter(isDefined);
  const servedDatasetIds = new Set(cachedRelations.map(prop("datasetId")));

  return {
    cachedRelations,
    growFromColumnsByDatasetId: _toGrowFromColumnsByDatasetId(misses),
    uncachedDatasetIds: options.datasetIds.filter((datasetId) => {
      return !servedDatasetIds.has(datasetId);
    }),
  };
}

async function _projectAcquiredBlob(
  options: Readonly<{
    columns: readonly string[] | "all";
    datasetDuckDbLease: DatasetDuckDbLease;
    parquetBlob: Blob;
  }>,
): Promise<Blob> {
  if (options.columns === "all") {
    return options.parquetBlob;
  }
  return DuckDbClient.projectParquetBlob({
    columns: options.columns,
    datasetDuckDbLease: options.datasetDuckDbLease,
    parquetBlob: options.parquetBlob,
  });
}

/**
 * Fetches one relation's bytes, through the wrapper the registry resolves.
 *
 * The storage cache is **not** consulted here: `probeStorageRelationCache` ran
 * before dispatch, so everything reaching this function is already known to be
 * a miss. A wrapper must never consult a cache either, which is why the probe
 * belongs to the mediator rather than to either side of this call.
 *
 * `workspaceId` comes from the dataset record rather than from session state,
 * which is why no workspace has to be threaded down from the query runner. The
 * public session has no workspace of its own, so deriving it per relation is
 * what lets both sessions share one path.
 */
async function _fetchRelationSource(
  options: Readonly<FetchRelationSourceOptions>,
): Promise<AcquiredRelationBytes> {
  const { dataset } = options.relationSource;
  const ref = { kind: "dataset", id: dataset.id } as const;
  const wrapper = getWrapperForRef(options.relationRegistry, ref);

  if (!wrapper?.acquire) {
    throw new Error(
      `No wrapper can acquire dataset '${dataset.id}' (${dataset.name})`,
    );
  }

  const acquireSet = unionColumnSets(
    options.neededByDatasetId[dataset.id] ?? "all",
    options.growFromColumnsByDatasetId[dataset.id] ?? [],
  );
  const acquired = await wrapper.acquire(
    { ref, columns: acquireSet },
    { workspaceId: dataset.workspaceId, logger: _relationLogger },
  );
  return {
    columns: acquireSet,
    datasetId: dataset.id,
    parquetBlob: await _projectAcquiredBlob({
      columns: acquireSet,
      datasetDuckDbLease: options.datasetDuckDbLease,
      parquetBlob: acquired.parquetBlob,
    }),
  };
}

/**
 * Fetches each relation's parquet bytes, one relation source at a time.
 *
 * A virtual dataset's source runs its own QETL query under the same dataset
 * lease, which loads further tables into the shared queryable relation cache.
 * So these fetches must stay sequential rather than racing each other on that
 * shared cache.
 */
export async function fetchRelationBytes(
  options: Readonly<{
    datasetDuckDbLease: DatasetDuckDbLease;
    growFromColumnsByDatasetId: NeededColumnsByDatasetId;
    neededByDatasetId: NeededColumnsByDatasetId;
    relationSources: readonly RelationSource[];
    runQuery: QetlRunQuery;
  }>,
): Promise<AcquiredRelationBytes[]> {
  const relationRegistry = _createRegistryForFetch(options);

  return options.relationSources.reduce<Promise<AcquiredRelationBytes[]>>(
    async (priorBytesPromise, relationSource) => {
      // Chaining on the prior promise is what keeps the fetches sequential:
      // one source's nested query can load tables the next one reads.
      // react-doctor-disable-next-line
      const priorBytes = await priorBytesPromise;
      // react-doctor-disable-next-line
      const relationBytes = await _fetchRelationSource({
        ...options,
        relationSource,
        relationRegistry,
      });
      return priorBytes.concat(relationBytes);
    },
    Promise.resolve([]),
  );
}

async function _writeStoredRelationBytes(
  options: Readonly<{
    principalKey: PrincipalKey;
    relationCache: RelationCachePort;
    relationsToStore: readonly AcquiredRelationBytes[];
  }>,
): Promise<void> {
  await promiseMap(options.relationsToStore, async (relation) => {
    try {
      await options.relationCache.write({
        identity: {
          principal: options.principalKey,
          relation: { kind: "dataset", id: relation.datasetId },
          definition: undefined,
          sourceVersion: undefined,
        },
        columns: relation.columns,
        payload: relation.parquetBlob,
      });
    } catch (error) {
      _relationLogger.error(
        `Failed to cache relation ${relation.datasetId}; the query continues`,
        { error },
      );
    }
  });
}

/**
 * Writes newly acquired relations to the storage tier and loads every relation
 * into the queryable tier.
 *
 * `relationsToStore` is passed separately rather than derived, because the
 * caller already knows which relations came out of the cache and which were
 * just acquired.
 *
 * A write failure does not fail the query. The bytes are in hand and the
 * queryable tier is about to receive them, so a full disk costs the next
 * query a re-fetch rather than costing this one its result.
 */
export async function loadRelationBytes(
  options: Readonly<{
    relations: readonly AcquiredRelationBytes[];
    relationsToStore: readonly AcquiredRelationBytes[];
    datasetDuckDbLease: DatasetDuckDbLease;
    relationCache: RelationCachePort;
    principalKey: PrincipalKey;
  }>,
): Promise<void> {
  await _writeStoredRelationBytes(options);
  const columns = await DatasetColumnClient.withCache(AvaQueryClient)
    .withEnsureQueryData()
    .getAll(
      where("dataset_id", "in", options.relations.map(prop("datasetId"))),
    );
  const columnsByDatasetId = makeBucketRecord(columns, { key: "datasetId" });
  await promiseMap(options.relations, async (relation) => {
    await DuckDbClient.loadParquet({
      tableName: relation.datasetId,
      blob: relation.parquetBlob,
      datasetDuckDbLease: options.datasetDuckDbLease,
      columnReplacements: makeIdLookupRecord(
        _getColumnReplacements(
          (columnsByDatasetId[relation.datasetId] ?? []).filter((column) => {
            return _isColumnInLoadedRelation(relation.columns, column);
          }),
        ),
        { key: "originalName" },
      ),
    });
    rememberQueryableColumns(relation.datasetId, relation.columns);
  });
}
