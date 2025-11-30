import { Logger } from "$/lib/Logger/Logger";
import { where } from "$/lib/utils/filters/filters";
import { isDefined } from "$/lib/utils/guards/isDefined";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { DatasetRawDataClient } from "@/clients/datasets/DatasetRawDataClient";
import { DuckDBClient } from "@/clients/DuckDBClient";
import { EntityClient } from "@/clients/entities/EntityClient";
import { getSQLSelectOfExtractor } from "@/clients/entities/EntityFieldValueClient/getEntityFieldValues/getDatasetColumnFieldValues";
import { assertIsDefined } from "@/lib/utils/asserts";
import { makeObject } from "@/lib/utils/objects/builders";
import { prop, propEq } from "@/lib/utils/objects/higherOrderFuncs";
import { Entity } from "@/models/entities/Entity";
import {
  BuildableEntityConfig,
  EntityConfigModule,
} from "@/models/EntityConfig";

/**
 * Run a basic QETL pipeline to generate entities.
 */
export async function generateEntities(
  entityConfig: BuildableEntityConfig,
): Promise<void> {
  const entConfig = EntityConfigModule.bind(entityConfig);

  // 1. Figure out what source datasets we need to query.
  const primaryKeyFields = entConfig.getIdFields();
  const titleField = entConfig.getTitleField();
  const allFields = [...primaryKeyFields, titleField];

  const datasetColumnValueExtractors = allFields
    .map((field) => {
      return field.valueExtractor.type === "dataset_column_value" ?
          field.valueExtractor
        : undefined;
    })
    .filter(isDefined);

  // get all source datasets and their local DuckDB table names
  const sourceDatasetIds = [
    // remove duplicates
    ...new Set(datasetColumnValueExtractors.map(prop("datasetId"))),
  ].filter(isDefined);

  // get all columns that we need to extract values from
  const sourceDatasetColumns = await DatasetColumnClient.getAll(
    where(
      "id",
      "in",
      datasetColumnValueExtractors.map(prop("datasetColumnId")),
    ),
  );
  const columnsById = makeObject(sourceDatasetColumns, { key: "id" });

  // map each extractor to its column and table name
  const extractorColumnsLookup = makeObject(datasetColumnValueExtractors, {
    key: "id",
    valueFn: (extractor) => {
      const column = columnsById[extractor.datasetColumnId];
      assertIsDefined(
        column,
        `Could not find column "${extractor.datasetColumnId}"`,
      );
      return column;
    },
  });

  // 2. Get the dataset columns to use for external IDs and the entity title
  const primaryKeyExtractors = datasetColumnValueExtractors.filter(
    (extractor) => {
      return primaryKeyFields.some(propEq("id", extractor.entityFieldConfigId));
    },
  );
  const titleExtractor = datasetColumnValueExtractors.find((extractor) => {
    return extractor.entityFieldConfigId === titleField.id;
  })!;
  const primaryKeyExtractorsByDatasetId = makeObject(primaryKeyExtractors, {
    key: "datasetId",
  });
  const titleColumn = extractorColumnsLookup[titleExtractor.id]!;
  const titleDatasetPrimaryKeyColumn =
    extractorColumnsLookup[
      primaryKeyExtractorsByDatasetId[titleColumn.datasetId]!.id
    ]!;

  await DatasetRawDataClient.runLocalRawQuery({
    dependencies: sourceDatasetIds,
    query: `
      DROP TABLE IF EXISTS "$entityConfigId$";

      CREATE TABLE "$entityConfigId$" AS (
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
          '$entityConfigId$' AS entity_config_id,
          NULL::UUID AS assigned_to,
          'active' AS status,
          external_id,
          $titleSelector$
        FROM external_ids
      );
    `,
    queryArgs: {
      workspaceId: entityConfig.workspaceId,
      entityConfigId: entityConfig.id,
      externalIdSelectors: primaryKeyExtractors
        .map((extractor) => {
          const column = extractorColumnsLookup[extractor.id]!;
          return `SELECT "${column.name}" AS external_id FROM "${column.datasetId}"`;
        })
        .join(" UNION ALL "),
      titleSelector: getSQLSelectOfExtractor({
        selectColumnName: titleColumn.name,
        primaryKeyColumnName: titleDatasetPrimaryKeyColumn.name,
        datasetId: titleColumn.datasetId,
        ruleType: titleExtractor.valuePickerRuleType,
        outputColumnName: "name",
        externalIdsTable: "external_ids",
        externalIdColumn: "external_id",
      }),
    },
  });
  Logger.log("Successfully generated all entities. Starting upsert...");

  // 3. Now upload all data to Supabase
  // TODO(jpsyx): NOTE: this will do an upsert on all rows. There is definitely
  // optimization that can be done to only upsert new rows or rows that have
  // a new name. There is no need to upsert rows that already exist and have
  // not changed.
  const jobSummary = await DuckDBClient.forEachQueryPage<Entity<"DBRead">>(
    { tableName: entityConfig.id, castTimestampsToISO: true },
    async (page) => {
      await EntityClient.crudFunctions.bulkInsert({
        data: page.data,
        upsert: true,
        onConflict: {
          columnNames: ["external_id", "entity_config_id"],
          ignoreDuplicates: false,
        },
        logger: Logger,
      });
    },
  );

  Logger.log(`Finished upserting all pages`, jobSummary);
}
