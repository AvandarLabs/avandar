import {
  assertIsDefined,
  hasDefinedProps,
  isDefined,
  makeBucketRecord,
  makeMap,
  makeObject,
  objectValuesMap,
  prop,
  propEq,
  sqlTemplate,
  where,
} from "@avandar/utils";
import { t } from "@lingui/core/macro";
import { Concept } from "$/models/ontology/Concept/Concept";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { getStagingIndividualsTableName } from "@/clients/DuckDbClient/duckDbSqlText";
import { getSQLSelectOfMapping } from "@/clients/ontology/AttributeAssertionClient/getAttributeAssertions/getSQLSelectOfMapping";
import { IndividualClient } from "@/clients/ontology/IndividualClient";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { JobProgressStore } from "@/lib/utils/state/JobProgressStore/JobProgressStore";
import { Logger } from "@/utils/Logger";
import {
  diffStagedIndividualsPage,
  getNewlyStaleIndividuals,
} from "@/views/OntologyDesignerApp/ConceptMetaView/generateIndividuals/diffStagedIndividualsHelpers/diffStagedIndividualsHelpers";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { DatasetColumnRead } from "$/models/datasets/DatasetColumn/DatasetColumn.types";
import type { AttributeMapping } from "$/models/ontology/AttributeMapping/AttributeMapping.types";
import type {
  DatasetColumnMapping,
  DatasetColumnMappingId,
} from "$/models/ontology/AttributeMapping/DatasetColumnMapping/DatasetColumnMapping.types";
import type { BuildableConcept } from "$/models/ontology/Concept/Concept.types";
import type { Workspace } from "$/models/Workspace/Workspace";
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
    data: diffResult.rowsToWrite,
    upsert: true,
    onConflict: {
      columnNames: ["external_id", "concept_id"],
      ignoreDuplicates: false,
    },
    logger: Logger,
  });
}

/**
 * The dataset-column mapping lookups needed to build the staging SQL: which
 * mappings identify an individual, which one supplies its label, and the
 * dataset columns and column lists each of those mappings resolves to.
 */
type IndividualSourceMappings = {
  identifierMappings: DatasetColumnMapping[];
  labelMapping: DatasetColumnMapping;
  titleColumn: DatasetColumnRead;
  titleDatasetPrimaryKeyColumn: DatasetColumnRead;
  mappingColumnsLookup: Record<DatasetColumnMappingId, DatasetColumnRead>;
  neededColumnsByDatasetId: Record<Dataset.Id, string[]>;
};

/**
 * Resolves a concept's identifier and label attributes down to the dataset
 * columns they map to, returning everything the staging SQL needs to select
 * external ids and names from those columns.
 */
async function _resolveIndividualSourceMappings(
  concept: BuildableConcept,
): Promise<IndividualSourceMappings> {
  const entConfig = Concept.bind(concept);

  const identifierAttributes = entConfig.getIdentifierAttributes();
  const labelAttribute = entConfig.getLabelAttribute();
  const allAttributes = [...identifierAttributes, labelAttribute];

  const datasetColumnMappings = allAttributes
    .map((attribute) => {
      return attribute.mapping.type === "dataset_column"
        ? attribute.mapping
        : undefined;
    })
    .filter(isDefined);

  // get all columns that we need to extract values from
  const sourceDatasetColumns = await DatasetColumnClient.getAll(
    where("id", "in", datasetColumnMappings.map(prop("datasetColumnId"))),
  );
  const columnsById = makeObject(sourceDatasetColumns, { key: "id" });

  // map each mapping to its column and table name
  const mappingColumnsLookup = makeObject(datasetColumnMappings, {
    key: "id",
    valueFn: (mapping) => {
      const column = columnsById[mapping.datasetColumnId];
      assertIsDefined(
        column,
        `Could not find column "${mapping.datasetColumnId}"`,
      );
      return column;
    },
  });

  // Get the dataset columns to use for external IDs and the individual title
  const identifierMappings = datasetColumnMappings.filter((mapping) => {
    return identifierAttributes.some(propEq("id", mapping.conceptAttributeId));
  });
  const labelMapping = datasetColumnMappings.find((mapping) => {
    return mapping.conceptAttributeId === labelAttribute.id;
  })!;
  const identifierMappingsByDatasetId = makeObject(identifierMappings, {
    key: "datasetId",
  });
  const titleColumn = mappingColumnsLookup[labelMapping.id]!;
  const titleDatasetPrimaryKeyColumn =
    mappingColumnsLookup[
      identifierMappingsByDatasetId[titleColumn.datasetId]!.id
    ]!;

  const neededColumnsByDatasetId = objectValuesMap(
    makeBucketRecord(
      datasetColumnMappings.map((mapping) => {
        return mappingColumnsLookup[mapping.id]!;
      }),
      { key: "datasetId" },
    ),
    (columns) => {
      return columns.map(prop("name"));
    },
  );

  return {
    identifierMappings,
    labelMapping,
    titleColumn,
    titleDatasetPrimaryKeyColumn,
    mappingColumnsLookup,
    neededColumnsByDatasetId,
  };
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
      titleSelector: getSQLSelectOfMapping({
        selectColumnName: titleColumn.name,
        primaryKeyColumnName: titleDatasetPrimaryKeyColumn.name,
        datasetId: titleColumn.datasetId,
        ruleType: labelMapping.valuePickerRuleType,
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
 * Runs the sync for one concept once its progress job already exists.
 */
async function _runGenerateIndividuals(
  concept: BuildableConcept,
  jobId: JobId,
): Promise<void> {
  const mappings = await _resolveIndividualSourceMappings(concept);

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
        data: staleRows,
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
 * Runs the Qetl pipeline to generate individuals for a concept, reporting
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
