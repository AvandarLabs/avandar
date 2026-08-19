import {
  assertIsDefined,
  isDefined,
  makeObject,
  prop,
  propEq,
  sqlTemplate,
  where,
} from "@avandar/utils";
import { Concept } from "$/models/ontology/Concept/Concept";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { DuckDbClient } from "@/clients/DuckDbClient/DuckDbClient";
import { getSQLSelectOfMapping } from "@/clients/ontology/AttributeAssertionClient/getAttributeAssertions/getSQLSelectOfMapping";
import { IndividualClient } from "@/clients/ontology/IndividualClient";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { Logger } from "@/utils/Logger";
import type { BuildableConcept } from "$/models/ontology/Concept/Concept.types";
import type { Individual } from "$/models/ontology/Individual/Individual";

/**
 * Run a basic Qetl pipeline to generate individuals.
 */
export async function generateIndividuals(
  concept: BuildableConcept,
): Promise<void> {
  const entConfig = Concept.bind(concept);

  // 1. Figure out what source datasets we need to query.
  const identifierAttributes = entConfig.getIdentifierAttributes();
  const labelAttribute = entConfig.getLabelAttribute();
  const allAttributes = [...identifierAttributes, labelAttribute];

  const datasetColumnMappings = allAttributes
    .map((attribute) => {
      return attribute.mapping.type === "dataset_column" ?
          attribute.mapping
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

  // 2. Get the dataset columns to use for external IDs and the individual title
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

  await WorkspaceQuerySession.runQuery({
    rawSql: sqlTemplate(`
      DROP TABLE IF EXISTS "$conceptId$";

      CREATE TABLE "$conceptId$" AS (
        -- Find all external IDs
        WITH external_ids AS (
          SELECT
            DISTINCT external_id
          FROM ($externalIdSelectors$)
          WHERE external_id IS NOT NULL
        )

        -- Get all names and join the tables together
        SELECT
          gen_random_uuid() AS id,
          NOW() as created_at,
          NOW() as updated_at,
          '$workspaceId$' AS workspace_id,
          '$conceptId$' AS concept_id,
          NULL::UUID AS assigned_to,
          'active' AS status,
          external_id,
          $titleSelector$
        FROM external_ids
      );
    `).parse({
      workspaceId: concept.workspaceId,
      conceptId: concept.id,
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
    workspaceId: concept.workspaceId,
  });
  Logger.log("Successfully generated all individuals. Starting upsert...");

  // 3. Now upload all data to Supabase
  // TODO(jpsyx): NOTE: this will do an upsert on all rows. There is definitely
  // optimization that can be done to only upsert new rows or rows that have
  // a new name. There is no need to upsert rows that already exist and have
  // not changed.
  const jobSummary = await DuckDbClient.forEachQueryPage<
    Individual.T<"DBRead">
  >({
    query: { tableName: concept.id, castTimestampsToISO: true },
    callback: async (page) => {
      await IndividualClient.crudFunctions.bulkInsert({
        data: page.data,
        upsert: true,
        onConflict: {
          columnNames: ["external_id", "concept_id"],
          ignoreDuplicates: false,
        },
        logger: Logger,
      });
    },
  });

  Logger.log(`Finished upserting all pages`, jobSummary);
}
