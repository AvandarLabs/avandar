import { makeIdLookupRecord, makeObject, prop } from "@avandar/utils";
import { readPostgresTableCsvAsText } from "@/clients/qetl/QueryMediator/relationLoading/readPostgresTableCsvAsText/readPostgresTableCsvAsText";
import { createDefaultRegistry } from "@/clients/qetl/wrappers/createDefaultRegistry";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { GoogleSheetsDataset } from "$/models/datasets/GoogleSheetsDataset/GoogleSheetsDataset";
import type { PostgresTableDataset } from "$/models/datasets/PostgresTableDataset/PostgresTableDataset";
import type { DatasetDuckDbLease } from "@/clients/DuckDbClient/DatasetDuckDbCoordinator/DatasetDuckDbCoordinator";
import type {
  QetlRunQuery,
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

function _isGoogleSheetsRelationSource(
  relationSource: Readonly<RelationSource>,
): relationSource is Extract<RelationSource, { sourceType: "google_sheets" }> {
  return relationSource.sourceType === "google_sheets";
}

function _isPostgresTableRelationSource(
  relationSource: Readonly<RelationSource>,
): relationSource is Extract<RelationSource, { sourceType: "postgres_table" }> {
  return relationSource.sourceType === "postgres_table";
}

function _googleSheetsSourceByDatasetId(
  relationSources: readonly RelationSource[],
): Record<string, GoogleSheetsDataset.T> {
  return makeObject(relationSources.filter(_isGoogleSheetsRelationSource), {
    keyFn: prop("dataset.id"),
    valueFn: prop("sourceDataset"),
  });
}

function _postgresTableSourceByDatasetId(
  relationSources: readonly RelationSource[],
): Record<string, PostgresTableDataset.T> {
  return makeObject(relationSources.filter(_isPostgresTableRelationSource), {
    keyFn: prop("dataset.id"),
    valueFn: prop("sourceDataset"),
  });
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
    googleSheetsByDatasetId: _googleSheetsSourceByDatasetId(relationSources),
    postgresTableByDatasetId: _postgresTableSourceByDatasetId(relationSources),
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
    readPostgresTableCsv: async ({
      datasetId,
      csvText,
    }: {
      datasetId: Dataset.Id;
      csvText: string;
    }) => {
      return await readPostgresTableCsvAsText({
        datasetId,
        csvText,
        datasetDuckDbLease,
      });
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

export function createRegistryForFetch(
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
    getGoogleSheetsSource: async (id) => {
      return _getOrThrow(
        lookups.googleSheetsByDatasetId[id],
        `Google Sheets dataset '${id}' is not among the relations to fetch`,
      );
    },
    getPostgresTableSource: async (id) => {
      return _getOrThrow(
        lookups.postgresTableByDatasetId[id],
        `Postgres table dataset '${id}' is not among the relations to fetch`,
      );
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
