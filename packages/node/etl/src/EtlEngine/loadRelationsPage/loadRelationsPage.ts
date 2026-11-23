import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { promiseMapSequential } from "@avandar/utils";
import { buildListingRowFromRelation } from "@etl/EtlEngine/buildListingRowFromRelation/buildListingRowFromRelation";
import { isListingRowUnchanged } from "@etl/EtlEngine/isListingRowUnchanged/isListingRowUnchanged";
import { prepareParquetRelation } from "@etl/EtlEngine/prepareParquetRelation/prepareParquetRelation";
import { buildListingKeyFromRow } from "@etl/stores/buildListingKeyFromRow/buildListingKeyFromRow";
import { splitIntoChunks } from "@etl/utils/splitIntoChunks/splitIntoChunks";
import type { EtlWorkspaceLoadabilityRules } from "@etl/EtlConfig/EtlConfig.types";
import type { CrawlMetricsRecorder } from "@etl/EtlEngine/crawlMetrics/crawlMetrics";
import type {
  EtlPipelineRunId,
  EtlStores,
  Relation,
  RelationColumn,
} from "@etl/EtlEngine/EtlEngine.types";
import type { WriteThrottle } from "@etl/EtlEngine/writeThrottle/createWriteThrottle";
import type {
  ListingRowValues,
  ListingsStore,
  ListingWithColumns,
  RelationColumnRow,
  StoredListingRow,
} from "@etl/stores/EtlStores.types";

/** Rows per read and per write, so each request's URL and body stay small. */
export const LISTING_CHUNK_SIZE = 200;

/**
 * The most relation columns one write carries, so a page of wide datasets
 * still makes small requests. A listing with more columns than this is
 * written alone, since a listing and its columns are never split.
 */
export const COLUMNS_PER_WRITE = 5000;

/** The metadata key holding a SHA-256 of a row's declared relation columns. */
const COLUMNS_FINGERPRINT_KEY = "relation_columns_sha256";

/** What `loadRelationsPage` needs to know about the run and drive. */
export type LoadRelationsPageContext = Readonly<{
  pipelineName: string;
  pipelineRunId: EtlPipelineRunId;
  service: string | undefined;
  driveKey: string;
  /** The drive's `data_catalog_drives.id`, or undefined with no store. */
  driveId: string | undefined;
  /** The scope the page was crawled for. */
  scopeKey: string;
  syncedAt: Date;
  stores: EtlStores;
  bucket: string | undefined;
  /** The crawl's metrics, which this page's reads and writes add to. */
  metrics: CrawlMetricsRecorder;
  /**
   * The crawl's throttle, which sizes each write to how the database is
   * keeping up and retries reads and writes that fail transiently.
   */
  writeThrottle: WriteThrottle;
  /** The formats a workspace cannot load. Omit to rule out none. */
  workspaceLoadability?: EtlWorkspaceLoadabilityRules;
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

type _PreparedRelation = ListingWithColumns &
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

function _addColumnsFingerprint(
  prepared: ListingWithColumns,
): ListingRowValues {
  const { row, columns } = prepared;
  return {
    ...row,
    metadata: {
      ...(row.metadata ?? {}),
      [COLUMNS_FINGERPRINT_KEY]: _buildColumnsFingerprint(columns),
    },
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
      driveId: context.driveId,
      syncedAt: context.syncedAt,
      scopeKey: context.scopeKey,
      workspaceLoadability: context.workspaceLoadability,
    });
    return { relation, row, key: buildListingKeyFromRow(row) };
  });
}

async function _readStoredRowsByKey(args: {
  rows: readonly ListingRowValues[];
  listings: ListingsStore;
  writeThrottle: WriteThrottle;
}): Promise<Map<string, StoredListingRow>> {
  const storedChunks = await promiseMapSequential(
    splitIntoChunks(args.rows, LISTING_CHUNK_SIZE),
    (chunk) => {
      return args.writeThrottle.retryTransient(() => {
        return args.listings.readRowsMatching(chunk);
      });
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
): Promise<ListingWithColumns> {
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
      metrics: context.metrics,
    });
  }
  return { row: args.row, columns: relation.columns.map(_buildColumnRow) };
}

/**
 * The row's scope keys once this page's scope is recorded: the stored row's
 * keys in their stored order, plus this scope's key when it is missing.
 * Keeping the stored order is what lets a row this scope already produced
 * compare unchanged.
 */
function _mergeStoredScopeKeys(args: {
  row: ListingRowValues;
  stored: StoredListingRow | undefined;
  scopeKey: string;
}): ListingRowValues {
  const storedKeys = args.stored?.pipeline_scope_keys ?? [];
  const mergedKeys = storedKeys.includes(args.scopeKey)
    ? storedKeys
    : [...storedKeys, args.scopeKey];
  return { ...args.row, pipeline_scope_keys: [...mergedKeys] };
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
    row: _mergeStoredScopeKeys({
      row,
      stored,
      scopeKey: args.context.scopeKey,
    }),
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

/**
 * Adds the page's considered listings and columns, its widest listing, and
 * the source sizes its relations report to the crawl's metrics.
 */
function _countConsidered(args: {
  relations: readonly Relation[];
  preparedRelations: readonly _PreparedRelation[];
  metrics: CrawlMetricsRecorder;
}): void {
  const { metrics } = args;
  metrics.count("listingsConsidered", args.preparedRelations.length);
  args.preparedRelations.forEach(({ columns }) => {
    metrics.count("columnsConsidered", columns.length);
    metrics.observeListingWidth(columns.length);
  });
  args.relations.forEach((relation) => {
    if (relation.sourceSizeBytes !== undefined) {
      metrics.addSourceBytes(relation.sourceSizeBytes);
    }
  });
}

/** How many JSON bytes a listing and its columns add to a write. */
function _measureWriteBytes(prepared: _PreparedRelation): number {
  return Buffer.byteLength(
    JSON.stringify({ row: prepared.row, columns: prepared.columns }),
  );
}

/**
 * How many relations, from `start`, the next write takes: at most
 * `LISTING_CHUNK_SIZE` listings, `COLUMNS_PER_WRITE` columns, and
 * `byteBudget` bytes, and always at least one, so a listing larger than a
 * cap is written alone rather than never. A listing and its columns are
 * never split.
 */
function _countNextBatch(args: {
  relations: readonly _PreparedRelation[];
  writeBytes: readonly number[];
  start: number;
  byteBudget: number;
}): number {
  let count = 1;
  let columnCount = args.relations[args.start]?.columns.length ?? 0;
  let byteCount = args.writeBytes[args.start] ?? 0;
  while (args.start + count < args.relations.length) {
    const next = args.start + count;
    const nextColumns = args.relations[next]?.columns.length ?? 0;
    const nextBytes = args.writeBytes[next] ?? 0;
    const fits =
      count < LISTING_CHUNK_SIZE &&
      columnCount + nextColumns <= COLUMNS_PER_WRITE &&
      byteCount + nextBytes <= args.byteBudget;
    if (!fits) {
      break;
    }
    count += 1;
    columnCount += nextColumns;
    byteCount += nextBytes;
  }
  return count;
}

/**
 * Writes changed relations in batches sized by the throttle's byte budget,
 * oldest connection first. A batch that fails transiently is retried from
 * the same relation under the smaller budget the failure leaves, so every
 * relation is written exactly once and in order. Each batch is one
 * transaction, so a failed batch wrote nothing.
 */
async function _writeChangedRelations(args: {
  changedRelations: readonly _PreparedRelation[];
  listings: ListingsStore;
  metrics: CrawlMetricsRecorder;
  writeThrottle: WriteThrottle;
}): Promise<void> {
  const { changedRelations: relations, metrics, writeThrottle } = args;
  relations.forEach(({ columns }) => {
    metrics.count("columnsWritten", columns.length);
  });
  const writeBytes = relations.map(_measureWriteBytes);
  let start = 0;
  // Sequential on purpose: batches go oldest connection first, so a failure
  // partway leaves an oldest-first prefix of the page written, and each
  // write's time sets the next one's budget.
  while (start < relations.length) {
    const count = _countNextBatch({
      relations,
      writeBytes,
      start,
      byteBudget: writeThrottle.getByteBudget(),
    });
    const batch = relations.slice(start, start + count);
    try {
      await writeThrottle.timeWrite(() => {
        return metrics.time("loadWriteMs", () => {
          return args.listings.upsertListingsWithColumns(
            batch.map(({ row, columns }) => {
              return { row, columns };
            }),
          );
        });
      });
      metrics.count("writeBatches", 1);
      start += count;
    } catch (error: unknown) {
      await writeThrottle.waitAfterFailure(error);
    }
  }
}

/**
 * Loads one page of relations, writing only the rows that changed, oldest
 * connection first. Parquet objects are uploaded before any row is written.
 * Changed rows are written in batches, each row with its whole set of
 * relation columns in the same transaction, so a listing and its columns are
 * always written together. Each row carries `metadata.relation_columns_sha256`,
 * a fingerprint of its columns, so a change to the columns alone counts as
 * a change to the row. Adds the page's load timings and denominators to
 * `context.metrics`.
 *
 * @param args.relations - The page's relations, oldest connection first.
 * @param args.context - The run and drive the page belongs to.
 * @returns How many relations were written and how many were unchanged.
 * @throws Before any read or write when two relations share a listing key.
 */
export async function loadRelationsPage(args: {
  relations: readonly Relation[];
  context: LoadRelationsPageContext;
}): Promise<LoadRelationsPageResult> {
  const { context } = args;
  const relationsWithRows = _buildRelationsWithRows(args);
  _throwOnRepeatedListingKey(relationsWithRows);
  const storedByKey = await context.metrics.time("loadReadMs", () => {
    return _readStoredRowsByKey({
      rows: relationsWithRows.map(({ row }) => {
        return row;
      }),
      listings: context.stores.listings,
      writeThrottle: context.writeThrottle,
    });
  });
  const preparedRelations = await promiseMapSequential(
    relationsWithRows,
    (relationWithRow) => {
      return _prepareRelation({ relationWithRow, storedByKey, context });
    },
  );
  _countConsidered({
    relations: args.relations,
    preparedRelations,
    metrics: context.metrics,
  });
  const changedRelations = preparedRelations.filter(({ row, stored }) => {
    return (
      stored === undefined || !isListingRowUnchanged({ stored, next: row })
    );
  });
  await _writeChangedRelations({
    changedRelations,
    listings: context.stores.listings,
    metrics: context.metrics,
    writeThrottle: context.writeThrottle,
  });
  return {
    written: changedRelations.length,
    unchanged: preparedRelations.length - changedRelations.length,
  };
}
