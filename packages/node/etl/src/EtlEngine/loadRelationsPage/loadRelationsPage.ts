import { createHash } from "node:crypto";
import { promiseMapSequential } from "@avandar/utils";
import { buildListingRowFromRelation } from "@etl/EtlEngine/buildListingRowFromRelation/buildListingRowFromRelation";
import { isListingRowUnchanged } from "@etl/EtlEngine/isListingRowUnchanged/isListingRowUnchanged";
import { prepareParquetRelation } from "@etl/EtlEngine/prepareParquetRelation/prepareParquetRelation";
import { buildListingKeyFromRow } from "@etl/stores/buildListingKeyFromRow/buildListingKeyFromRow";
import type {
  EtlPipelineRunId,
  EtlStores,
  Relation,
  RelationColumn,
} from "@etl/EtlEngine/EtlEngine.types";
import type {
  ListingRowValues,
  ListingsStore,
  RelationColumnRow,
  StoredListingRow,
} from "@etl/stores/EtlStores.types";

/** Rows per read and per upsert, so each request's URL and body stay small. */
export const LISTING_CHUNK_SIZE = 200;

/** The metadata key holding a SHA-256 of a row's declared relation columns. */
const COLUMNS_FINGERPRINT_KEY = "relation_columns_sha256";

/** What `loadRelationsPage` needs to know about the run and drive. */
export type LoadRelationsPageContext = Readonly<{
  pipelineName: string;
  pipelineRunId: EtlPipelineRunId;
  service: string | undefined;
  driveKey: string;
  syncedAt: Date;
  stores: EtlStores;
  bucket: string | undefined;
}>;

/** How many of a page's relations were written and how many were skipped. */
export type LoadRelationsPageResult = Readonly<{
  written: number;
  unchanged: number;
}>;

type _RelationWithRow = Readonly<{
  relation: Relation;
  row: ListingRowValues;
  key: string;
}>;

type _RowAndColumns = Readonly<{
  row: ListingRowValues;
  columns: readonly RelationColumnRow[] | undefined;
}>;

type _PreparedRelation = _RowAndColumns &
  Readonly<{
    key: string;
    stored: StoredListingRow | undefined;
  }>;

type _BuildRowAndColumnsArgs = Readonly<{
  relation: Relation;
  row: ListingRowValues;
  stored: StoredListingRow | undefined;
  context: LoadRelationsPageContext;
}>;

function _splitIntoChunks<T>(items: readonly T[]): T[][] {
  return Array.from(
    { length: Math.ceil(items.length / LISTING_CHUNK_SIZE) },
    (_, index) => {
      return items.slice(
        index * LISTING_CHUNK_SIZE,
        (index + 1) * LISTING_CHUNK_SIZE,
      );
    },
  );
}

/** Splits relations into consecutive runs that share one listing kind. */
function _splitIntoRunsOfOneKind(
  preparedRelations: readonly _PreparedRelation[],
): _PreparedRelation[][] {
  return preparedRelations.reduce<_PreparedRelation[][]>((runs, prepared) => {
    const lastRun = runs.at(-1);
    if (lastRun?.[0]?.row.access_kind === prepared.row.access_kind) {
      lastRun.push(prepared);
    } else {
      runs.push([prepared]);
    }
    return runs;
  }, []);
}

function _buildColumnRow(
  column: RelationColumn,
  index: number,
): RelationColumnRow {
  return {
    column_name: column.name,
    display_order: index,
    original_data_type: column.originalDataType,
    cast_data_type: column.castDataType,
  };
}

function _buildColumnsFingerprint(
  columns: readonly RelationColumnRow[],
): string {
  // Each column's keys are sorted, so the hash depends only on the values and
  // the column order, not on how a column row object was built.
  const stableJson = JSON.stringify(
    columns.map((column) => {
      return Object.entries(column).sort(([keyA], [keyB]) => {
        return keyA < keyB ? -1 : 1;
      });
    }),
  );
  return createHash("sha256").update(stableJson).digest("hex");
}

function _addColumnsFingerprint(prepared: _RowAndColumns): ListingRowValues {
  const { row, columns } = prepared;
  if (columns === undefined) {
    return row;
  }
  return {
    ...row,
    metadata: {
      ...(row.metadata ?? {}),
      [COLUMNS_FINGERPRINT_KEY]: _buildColumnsFingerprint(columns),
    },
  };
}

function _omitColumnsFingerprint(row: ListingRowValues): ListingRowValues {
  return {
    ...row,
    metadata: Object.fromEntries(
      Object.entries(row.metadata ?? {}).filter(([key]) => {
        return key !== COLUMNS_FINGERPRINT_KEY;
      }),
    ),
  };
}

function _describeRelation(relation: Relation): string {
  return `"${relation.displayName}" (external dataset id "${relation.externalDatasetId}")`;
}

function _throwOnRepeatedListingKey(
  relationsWithRows: readonly _RelationWithRow[],
): void {
  const firstRelationByKey = new Map<string, Relation>();
  relationsWithRows.forEach(({ relation, key }) => {
    const firstRelation = firstRelationByKey.get(key);
    if (firstRelation !== undefined) {
      throw new Error(
        `Relations ${_describeRelation(firstRelation)} and ${_describeRelation(relation)} share the listing key ${key}. A page may hold each listing only once.`,
      );
    }
    firstRelationByKey.set(key, relation);
  });
}

function _buildRelationsWithRows(args: {
  relations: readonly Relation[];
  context: LoadRelationsPageContext;
}): _RelationWithRow[] {
  const { context } = args;
  return args.relations.map((relation) => {
    const row = buildListingRowFromRelation({
      relation,
      pipelineName: context.pipelineName,
      pipelineRunId: context.pipelineRunId,
      service: context.service,
      driveKey: context.driveKey,
      syncedAt: context.syncedAt,
    });
    return { relation, row, key: buildListingKeyFromRow(row) };
  });
}

async function _readStoredRowsByKey(args: {
  rows: readonly ListingRowValues[];
  listings: ListingsStore;
}): Promise<Map<string, StoredListingRow>> {
  const storedChunks = await promiseMapSequential(
    _splitIntoChunks(args.rows),
    (chunk) => {
      return args.listings.readRowsMatching(chunk);
    },
  );
  return new Map(
    storedChunks.flat().map((stored) => {
      return [buildListingKeyFromRow(stored), stored];
    }),
  );
}

async function _buildRowAndColumns(
  args: _BuildRowAndColumnsArgs,
): Promise<_RowAndColumns> {
  const { relation, context } = args;
  if (relation.kind === "pipeline_parquet") {
    return prepareParquetRelation({
      relation,
      row: args.row,
      stored: args.stored,
      pipelineName: context.pipelineName,
      pipelineRunId: context.pipelineRunId,
      objects: context.stores.objects,
      bucket: context.bucket,
    });
  }
  return { row: args.row, columns: relation.columns?.map(_buildColumnRow) };
}

async function _prepareRelation(args: {
  relationWithRow: _RelationWithRow;
  storedByKey: ReadonlyMap<string, StoredListingRow>;
  context: LoadRelationsPageContext;
}): Promise<_PreparedRelation> {
  const { relation, row, key } = args.relationWithRow;
  const stored = args.storedByKey.get(key);
  const prepared = await _buildRowAndColumns({
    relation,
    row,
    stored,
    context: args.context,
  });
  return {
    key,
    row: _addColumnsFingerprint(prepared),
    columns: prepared.columns,
    stored,
  };
}

async function _writeChunk(args: {
  chunk: readonly _PreparedRelation[];
  listings: ListingsStore;
}): Promise<void> {
  const { chunk, listings } = args;
  // A row with columns is first written without its columns fingerprint, so
  // a failure before the second write leaves a row the next load rewrites.
  const writtenRows = await listings.upsertRows(
    chunk.map(({ row, columns }) => {
      return columns === undefined ? row : _omitColumnsFingerprint(row);
    }),
  );
  const listingIdByKey = new Map(
    writtenRows.map((stored) => {
      return [buildListingKeyFromRow(stored), stored.id];
    }),
  );
  const withColumns = chunk.flatMap(({ key, row, columns }) => {
    return columns === undefined ? [] : [{ key, row, columns }];
  });
  await promiseMapSequential(withColumns, async ({ key, columns }) => {
    const listingId = listingIdByKey.get(key);
    if (listingId === undefined) {
      throw new Error(
        `The listings store returned no id for the written listing ${key}.`,
      );
    }
    await listings.replaceRelationColumns({ listingId, columns });
  });
  if (withColumns.length > 0) {
    await listings.upsertRows(
      withColumns.map(({ row }) => {
        return row;
      }),
    );
  }
}

async function _writeChangedRelations(args: {
  changedRelations: readonly _PreparedRelation[];
  listings: ListingsStore;
}): Promise<void> {
  // Each upsert takes one listing kind. Splitting into consecutive runs keeps
  // the page's oldest-first order across kinds.
  const chunks = _splitIntoRunsOfOneKind(args.changedRelations).flatMap(
    (run) => {
      return _splitIntoChunks(run);
    },
  );
  // Sequential on purpose: chunks go oldest connection first, so a failure
  // partway leaves an oldest-first prefix of the page written.
  await promiseMapSequential(chunks, (chunk) => {
    return _writeChunk({ chunk, listings: args.listings });
  });
}

/**
 * Loads one page of relations, writing only the rows that changed, oldest
 * connection first. Parquet objects are uploaded before any row is written.
 * Each chunk of changed rows is upserted, then the relation columns of its
 * rows that declare them are replaced, then those rows are upserted again
 * with `metadata.relation_columns_sha256`, a fingerprint of their columns. A
 * failure between those writes leaves a row without the fingerprint, which
 * the next load sees as changed and rewrites.
 *
 * @param args.relations - The page's relations, oldest connection first.
 * @param args.context - The run and drive the page belongs to.
 * @returns How many relations were written and how many were unchanged.
 * @throws Before any read or write when two relations share a listing key,
 * and when the store returns no id for a written row with columns.
 */
export async function loadRelationsPage(args: {
  relations: readonly Relation[];
  context: LoadRelationsPageContext;
}): Promise<LoadRelationsPageResult> {
  const { context } = args;
  const relationsWithRows = _buildRelationsWithRows(args);
  _throwOnRepeatedListingKey(relationsWithRows);
  const storedByKey = await _readStoredRowsByKey({
    rows: relationsWithRows.map(({ row }) => {
      return row;
    }),
    listings: context.stores.listings,
  });
  const preparedRelations = await promiseMapSequential(
    relationsWithRows,
    (relationWithRow) => {
      return _prepareRelation({ relationWithRow, storedByKey, context });
    },
  );
  const changedRelations = preparedRelations.filter(({ row, stored }) => {
    return (
      stored === undefined || !isListingRowUnchanged({ stored, next: row })
    );
  });
  await _writeChangedRelations({
    changedRelations,
    listings: context.stores.listings,
  });
  return {
    written: changedRelations.length,
    unchanged: preparedRelations.length - changedRelations.length,
  };
}
