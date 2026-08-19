import {
  isDefined,
  makeBucketRecord,
  makeIdLookupRecord,
  promiseMap,
  prop,
  propEq,
  where,
} from "@avandar/utils";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { LocalDatasetClient } from "@/clients/datasets/LocalDatasetClient/LocalDatasetClient";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { DuckDbDataTypeUtils } from "@/clients/DuckDbClient/DuckDbDataType";
import { getWrapperForRef } from "@/clients/qetl/RelationRegistry/RelationRegistry";
import { createDefaultRegistry } from "@/clients/qetl/wrappers/createDefaultRegistry";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import { Logger } from "@/utils/Logger";
import type { DatasetDuckDbLease } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type {
  AcquiredRelationBytes,
  ColumnReplacement,
  QetlRunnerOptions,
  QetlRunQuery,
  RelationSource,
} from "@/clients/qetl/QueryMediator/QueryMediator.types";
import type { RelationRegistry } from "@/clients/qetl/RelationRegistry/RelationRegistry";
import type { ILogger } from "@avandar/logger";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

type FetchRelationSourceOptions = {
  relationSource: RelationSource;
  datasetDuckDbLease: DatasetDuckDbLease;
  runQuery: QetlRunQuery;
  relationRegistry: RelationRegistry;
};

/** Named so wrapper diagnostics are attributable to relation acquisition. */
const _relationLogger: ILogger = Logger.appendName("QetlRelations");

function _getColumnReplacements(
  columns: readonly DatasetColumn.T[],
): ColumnReplacement[] {
  return columns
    .map((column) => {
      const hasChangedName = column.name !== column.originalName;
      const hasChangedDataType =
        column.dataType !==
        DuckDbDataTypeUtils.toAvaDataType(column.detectedDataType);
      return hasChangedName || hasChangedDataType ?
          {
            originalName: column.originalName,
            alias: hasChangedName ? column.name : undefined,
            dataType:
              hasChangedDataType ?
                DuckDbDataTypeUtils.fromDatasetColumnType(column.dataType)
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

async function _getCachedRelationBytes(
  relationSource: Readonly<RelationSource>,
): Promise<AcquiredRelationBytes | undefined> {
  const localDataset = await LocalDatasetClient.getById({
    id: relationSource.dataset.id,
  });
  return localDataset?.parseStatus === "ready" && localDataset.parquetData ?
      {
        datasetId: relationSource.dataset.id,
        parquetBlob: localDataset.parquetData,
      }
    : undefined;
}

/**
 * Fetches one relation's bytes, through the wrapper the registry resolves.
 *
 * The local cache probe stays ahead of resolution, exactly where it is today: a
 * wrapper never consults a cache, so the probe belongs to this layer. Moving it
 * behind authorization is spec 2's change, not this one.
 *
 * `workspaceId` comes from the dataset record rather than from session state,
 * which is what `_downloadStoredDatasetFact` did before this and is why no
 * workspace has to be threaded down from the query runner. The public session
 * has no workspace of its own, so deriving it per relation is what lets both
 * sessions share one path.
 */
async function _fetchRelationSource(
  options: Readonly<FetchRelationSourceOptions>,
): Promise<AcquiredRelationBytes> {
  const cachedBytes = await _getCachedRelationBytes(options.relationSource);
  if (cachedBytes) {
    return cachedBytes;
  }

  const { dataset } = options.relationSource;
  const ref = { kind: "dataset", id: dataset.id } as const;
  const wrapper = getWrapperForRef(options.relationRegistry, ref);

  if (!wrapper?.acquire) {
    throw new Error(
      `No wrapper can acquire dataset '${dataset.id}' (${dataset.name})`,
    );
  }

  const acquired = await wrapper.acquire(
    { ref, columns: "all" },
    { workspaceId: dataset.workspaceId, logger: _relationLogger },
  );
  return { datasetId: dataset.id, parquetBlob: acquired.parquetBlob };
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
    relationSources: readonly RelationSource[];
    datasetDuckDbLease: DatasetDuckDbLease;
    runQuery: QetlRunQuery;
  }>,
): Promise<AcquiredRelationBytes[]> {
  // Every relation source already carries the dataset and, when virtual, the
  // defining SQL that `getRelationSources` read. The registry resolves from
  // those maps rather than querying again, because acquisition must not cost a
  // read the old dispatch did not make.
  const datasetsById = makeIdLookupRecord(
    options.relationSources.map(prop("dataset")),
  );
  const rawSqlByDatasetId = Object.fromEntries(
    options.relationSources
      .filter(_isVirtualRelationSource)
      .map((relationSource) => {
        return [relationSource.dataset.id, relationSource.sourceDataset.rawSql];
      }),
  );
  // One registry per call, with the caller's lease closed over: a virtual
  // dataset's defining SQL is itself a QETL query and has to run under the same
  // lease, or it races the outer query on the shared queryable relation cache.
  const relationRegistry = createDefaultRegistry({
    getRawSql: async (ref) => {
      const rawSql = rawSqlByDatasetId[ref.id];
      if (rawSql === undefined) {
        throw new Error(
          `Virtual dataset '${ref.id}' is not among the relations to fetch`,
        );
      }
      return rawSql;
    },
    getDataset: async (id) => {
      const dataset = datasetsById[id];
      if (!dataset) {
        throw new Error(`Dataset '${id}' is not among the relations to fetch`);
      }
      return dataset;
    },
    runParquetQuery: ({ rawSql }) => {
      return options.runQuery({
        rawSql,
        returnType: "parquet",
        datasetDuckDbLease: options.datasetDuckDbLease,
      });
    },
  });

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

/**
 * Writes fetched relations to the storage relation cache and loads them into
 * the queryable relation cache.
 */
export async function loadRelationBytes(
  options: Readonly<{
    relations: readonly AcquiredRelationBytes[];
    datasetDuckDbLease: DatasetDuckDbLease;
    insertToStorageCache: QetlRunnerOptions["insertToStorageCache"];
  }>,
): Promise<void> {
  const storedFacts = await LocalDatasetClient.withCache(AvaQueryClient)
    .withEnsureQueryData()
    .getAll(where("datasetId", "in", options.relations.map(prop("datasetId"))));
  const factsToCache = options.relations.filter((relation) => {
    return !storedFacts.some(propEq("datasetId", relation.datasetId));
  });
  await options.insertToStorageCache(factsToCache);
  const columns = await DatasetColumnClient.withCache(AvaQueryClient)
    .withEnsureQueryData()
    .getAll(
      where("dataset_id", "in", options.relations.map(prop("datasetId"))),
    );
  const columnsByDatasetId = makeBucketRecord(columns, { key: "datasetId" });
  await promiseMap(options.relations, (relation) => {
    return DuckDbClient.loadParquet({
      tableName: relation.datasetId,
      blob: relation.parquetBlob,
      datasetDuckDbLease: options.datasetDuckDbLease,
      columnReplacements: makeIdLookupRecord(
        _getColumnReplacements(columnsByDatasetId[relation.datasetId] ?? []),
        { key: "originalName" },
      ),
    });
  });
}
