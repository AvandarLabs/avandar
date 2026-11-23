import { hasDefinedProps, makeMap, sqlTemplate, where } from "@avandar/utils";
import { t } from "@lingui/core/macro";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { getStagingIndividualsTableName } from "@/clients/DuckDbClient/duckDbSqlText";
import { IndividualClient } from "@/clients/ontology/IndividualClient";
import { buildAttributeValueSql } from "@/clients/qetl/QueryMediator/conceptRelation/buildAttributeValueSql/buildAttributeValueSql";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { JobProgressStore } from "@/lib/utils/state/JobProgressStore/JobProgressStore";
import { Logger } from "@/utils/Logger";
import {
  diffStagedIndividualsPage,
  getNewlyStaleIndividuals,
  makeBulkInsertRowsFromUpsertRows,
} from "@/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/diffStagedIndividualsHelpers/diffStagedIndividualsHelpers";
import { resolveIndividualSourceMappings } from "./resolveIndividualSourceMappings";
import type { AttributeMapping } from "$/models/ontology/AttributeMapping/AttributeMapping.types";
import type { Concept } from "$/models/ontology/Concept/Concept";
import type { BuildableConcept } from "$/models/ontology/Concept/Concept.types";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { IndividualSourceMappings } from "./resolveIndividualSourceMappings";
import type { JobId } from "@/lib/utils/state/JobProgressStore/JobProgressStore";
import type {
  ExistingIndividual,
  StagedIndividualRow,
} from "@/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/diffStagedIndividualsHelpers/diffStagedIndividualsHelpers";
import type { SetDefined } from "@avandar/utils";
import type { SetRequired } from "type-fest";

/**
 * Narrows a concept's attributes down to the ones with a resolved mapping:
 * the shape {@link generateIndividuals} and {@link BuildableConcept} require.
 * Shared by the manual "Refresh" button and the auto-sync path that runs
 * right after a concept is created, so both agree on what counts as ready to
 * sync.
 */
export function getAttributesWithMapping<
  TAttribute extends { mapping?: AttributeMapping },
>(
  attributes: readonly TAttribute[],
): Array<
  SetRequired<TAttribute, "mapping"> & SetDefined<TAttribute, "mapping">
> {
  return attributes.filter(
    (
      attribute,
    ): attribute is SetRequired<TAttribute, "mapping"> &
      SetDefined<TAttribute, "mapping"> => {
      return hasDefinedProps(attribute, "mapping");
    },
  );
}

/**
 * Reads every existing individual for a concept and keys it by `external_id`
 * for the sync diff. A Map, not a plain object: `external_id` comes from
 * arbitrary source-dataset values, which must never be trusted as an object
 * key.
 */
async function _getExistingIndividualsByExternalId(
  conceptId: Concept.Id,
): Promise<Map<string, ExistingIndividual>> {
  const existingIndividuals = await IndividualClient.getAll(
    where("concept_id", "eq", conceptId),
  );
  return makeMap(existingIndividuals, {
    key: "externalId",
    valueFn: (individual) => {
      return {
        id: individual.id,
        name: individual.name,
        missingFromSourceAt: individual.missingFromSourceAt,
      };
    },
  });
}

/**
 * Diffs one staged page against the concept's existing individuals, upserting
 * only the rows that changed, and reports this page's progress.
 */
async function _diffAndUpsertPage(options: {
  stagedRows: readonly StagedIndividualRow[];
  existingByExternalId: ReadonlyMap<string, ExistingIndividual>;
  externalIdsSeenInSync: Set<string>;
  workspaceId: Workspace.Id;
  conceptId: Concept.Id;
  jobId: JobId;
  conceptName: string;
  pageNum: number;
  totalPages: number;
}): Promise<void> {
  const {
    stagedRows,
    existingByExternalId,
    externalIdsSeenInSync,
    workspaceId,
    conceptId,
    jobId,
    conceptName,
    pageNum,
    totalPages,
  } = options;

  JobProgressStore.updateJob(jobId, {
    status: "determinate",
    label: t`Refreshing ${conceptName} records…`,
    current: pageNum + 1,
    total: totalPages,
  });

  const diffResult = diffStagedIndividualsPage({
    stagedRows,
    existingByExternalId,
    workspaceId,
    conceptId,
  });
  diffResult.matchedExternalIds.forEach((externalId) => {
    externalIdsSeenInSync.add(externalId);
  });
  if (diffResult.rowsToWrite.length === 0) {
    return;
  }
  await IndividualClient.crudFunctions.bulkInsert({
    data: makeBulkInsertRowsFromUpsertRows(diffResult.rowsToWrite),
    upsert: true,
    onConflict: {
      columnNames: ["external_id", "concept_id"],
      ignoreDuplicates: false,
    },
    logger: Logger,
  });
}

/**
 * Builds and runs the `CREATE TABLE AS SELECT` that stages a concept's
 * individuals into DuckDB under `stagingTableName`, keyed by external id with
 * one resolved name column.
 */
async function _stageIndividuals(options: {
  workspaceId: Workspace.Id;
  stagingTableName: string;
  mappings: IndividualSourceMappings;
}): Promise<void> {
  const { workspaceId, stagingTableName, mappings } = options;
  const {
    identifierMappings,
    labelMapping,
    titleColumn,
    titleDatasetPrimaryKeyColumn,
    mappingColumnsLookup,
    neededColumnsByDatasetId,
  } = mappings;

  // Spelling out the columns is what keeps this from downloading whole
  // datasets. The statement below is a `CREATE TABLE AS SELECT`, and column
  // inference reads a top-level select list, which that shape does not have,
  // so every relation it names would otherwise be acquired as `"all"`.
  // Generating individuals reads exactly two columns per contributing dataset:
  // the identifier the spine is keyed by, and the label the title is picked
  // from. The staged table itself carries only `external_id` and `name`;
  // every other column the diff needs (workspace_id, concept_id) is already a
  // plain JS value and does not need a DuckDB round-trip.
  await WorkspaceQuerySession.runQuery({
    rawSql: sqlTemplate(`
      DROP TABLE IF EXISTS "$stagingTableName$";

      CREATE TABLE "$stagingTableName$" AS (
        -- Find all external IDs
        WITH external_ids AS (
          SELECT
            DISTINCT external_id
          FROM ($externalIdSelectors$)
          WHERE external_id IS NOT NULL
        )

        -- Get all names and join the tables together
        SELECT
          external_id,
          $titleSelector$
        FROM external_ids
      );
    `).parse({
      stagingTableName,
      externalIdSelectors: identifierMappings
        .map((mapping) => {
          const column = mappingColumnsLookup[mapping.id]!;
          return `SELECT "${column.name}" AS external_id FROM "${column.datasetId}"`;
        })
        .join(" UNION ALL "),
      titleSelector: buildAttributeValueSql({
        selectColumnName: titleColumn.name,
        primaryKeyColumnName: titleDatasetPrimaryKeyColumn.name,
        datasetId: titleColumn.datasetId,
        columnDataType: titleColumn.dataType,
        valuePickerRuleType: labelMapping.valuePickerRuleType,
        valueShape: "single",
        outputColumnName: "name",
        externalIdsTable: "external_ids",
        externalIdColumn: "external_id",
      }),
    }),
    workspaceId,
    neededColumnsByDatasetId,
  });
  Logger.log("Successfully generated all individuals. Starting diff/upsert...");
}

/**
 * Synchronizes individuals for a concept using an existing progress job.
 * Called by `generateIndividuals`, resolving when the sync is complete.
 */
async function _runGenerateIndividuals(
  concept: BuildableConcept,
  jobId: JobId,
): Promise<void> {
  const mappings = await resolveIndividualSourceMappings(concept);

  // Read every existing individual for this concept before touching DuckDB,
  // so a failure here never creates a staging table that then needs cleanup.
  const existingByExternalId = await _getExistingIndividualsByExternalId(
    concept.id,
  );

  // The rows are staged under a prefixed name rather than the concept's bare
  // id, because a bare UUID in a table name always means a dataset. See
  // `getStagingIndividualsTableName`.
  const stagingTableName = getStagingIndividualsTableName(concept.id);

  await _stageIndividuals({
    workspaceId: concept.workspaceId,
    stagingTableName,
    mappings,
  });

  const externalIdsSeenInSync = new Set<string>();

  try {
    const jobSummary = await DuckDbClient.forEachQueryPage<StagedIndividualRow>(
      {
        query: { tableName: stagingTableName, castTimestampsToISO: true },
        callback: async (page) => {
          await _diffAndUpsertPage({
            stagedRows: page.data,
            existingByExternalId,
            externalIdsSeenInSync,
            workspaceId: concept.workspaceId,
            conceptId: concept.id,
            jobId,
            conceptName: concept.name,
            pageNum: page.pageNum,
            totalPages: page.totalPages,
          });
        },
      },
    );

    Logger.log(`Finished upserting all pages`, jobSummary);

    const staleRows = getNewlyStaleIndividuals({
      existingByExternalId,
      externalIdsSeenInSync,
      workspaceId: concept.workspaceId,
      conceptId: concept.id,
      nowIso: new Date().toISOString(),
    });
    if (staleRows.length > 0) {
      await IndividualClient.crudFunctions.bulkInsert({
        data: makeBulkInsertRowsFromUpsertRows(staleRows),
        upsert: true,
        onConflict: {
          columnNames: ["external_id", "concept_id"],
          ignoreDuplicates: false,
        },
        logger: Logger,
      });
    }
  } finally {
    // Postgres holds the individuals once the upsert is done, so nothing reads
    // the staging table afterwards. Dropped in a `finally` rather than after
    // the upsert so a failed run does not leave it in the catalog either.
    await WorkspaceQuerySession.runQuery({
      rawSql: sqlTemplate(`DROP TABLE IF EXISTS "$stagingTableName$";`).parse({
        stagingTableName,
      }),
      workspaceId: concept.workspaceId,
    });
  }
}

/**
 * Runs the QETL pipeline to generate individuals for a concept, reporting
 * progress through {@link JobProgressStore} for the lifetime of the call.
 */
export async function generateIndividuals(
  concept: BuildableConcept,
): Promise<void> {
  const jobId = JobProgressStore.startJob(
    t`Refreshing ${concept.name} records…`,
  );

  try {
    await _runGenerateIndividuals(concept, jobId);
    JobProgressStore.finishJob(jobId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    JobProgressStore.failJob(jobId, message);
    throw error;
  }
}
