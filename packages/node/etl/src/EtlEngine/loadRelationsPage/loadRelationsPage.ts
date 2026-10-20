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

type _PreparedRelation = Readonly<{
  row: ListingRowValues;
  columns: readonly RelationColumnRow[] | undefined;
}>;

type _PrepareRelationArgs = Readonly<{
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

async function _prepareRelation(
  args: _PrepareRelationArgs,
): Promise<_PreparedRelation> {
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

async function _writeChangedRelations(args: {
  changedRelations: readonly _PreparedRelation[];
  listings: ListingsStore;
}): Promise<void> {
  // Sequential on purpose: chunks go oldest connection first, so a failure
  // partway leaves an oldest-first prefix of the page written.
  await promiseMapSequential(
    _splitIntoChunks(args.changedRelations),
    async (chunk) => {
      const writtenRows = await args.listings.upsertRows(
        chunk.map((prepared) => {
          return prepared.row;
        }),
      );
      const listingIdByKey = new Map(
        writtenRows.map((stored) => {
          return [buildListingKeyFromRow(stored), stored.id];
        }),
      );
      await promiseMapSequential(chunk, async ({ row, columns }) => {
        const listingId = listingIdByKey.get(buildListingKeyFromRow(row));
        if (columns === undefined || listingId === undefined) {
          return;
        }
        await args.listings.replaceRelationColumns({ listingId, columns });
      });
    },
  );
}

/**
 * Loads one page of relations: reads the stored rows for the page, builds
 * any Parquet objects, and writes only the rows that changed, each followed
 * by its relation columns. Relations must be ordered oldest connection first.
 *
 * @param args.relations - The page's relations, oldest connection first.
 * @param args.context - The run and drive the page belongs to.
 * @returns How many relations were written and how many were unchanged.
 */
export async function loadRelationsPage(args: {
  relations: readonly Relation[];
  context: LoadRelationsPageContext;
}): Promise<LoadRelationsPageResult> {
  const { relations, context } = args;
  const relationsWithRows = relations.map((relation) => {
    return {
      relation,
      row: buildListingRowFromRelation({
        relation,
        pipelineName: context.pipelineName,
        pipelineRunId: context.pipelineRunId,
        service: context.service,
        driveKey: context.driveKey,
        syncedAt: context.syncedAt,
      }),
    };
  });
  const storedByKey = await _readStoredRowsByKey({
    rows: relationsWithRows.map(({ row }) => {
      return row;
    }),
    listings: context.stores.listings,
  });
  const preparedRelations = await promiseMapSequential(
    relationsWithRows,
    ({ relation, row }) => {
      const stored = storedByKey.get(buildListingKeyFromRow(row));
      return _prepareRelation({ relation, row, stored, context });
    },
  );
  const changedRelations = preparedRelations.filter(({ row }) => {
    const stored = storedByKey.get(buildListingKeyFromRow(row));
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
