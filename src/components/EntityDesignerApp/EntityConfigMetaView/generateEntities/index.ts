import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { DatasetRawDataClient } from "@/clients/datasets/DatasetRawDataClient";
import { LocalDatasetEntryClient } from "@/clients/datasets/LocalDatasetEntryClient";
import { DuckDBClient } from "@/clients/DuckDBClient";
import { EntityClient } from "@/clients/entities/EntityClient";
import { getSQLSelectOfExtractor } from "@/clients/entities/EntityFieldValueClient/getEntityFieldValues/getDatasetColumnFieldValues";
import { Logger } from "@/lib/Logger";
import { assertIsDefined } from "@/lib/utils/asserts";
import { where } from "@/lib/utils/filters/filterBuilders";
import { isDefined } from "@/lib/utils/guards";
import {
  makeObject,
  makeObjectFromEntries,
} from "@/lib/utils/objects/builders";
import { getProp, propIs } from "@/lib/utils/objects/higherOrderFuncs";
import { promiseMap } from "@/lib/utils/promises";
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
    ...new Set(datasetColumnValueExtractors.map(getProp("datasetId"))),
  ].filter(isDefined);

  // get all source datasets we need to pull data from
  const localTableNameLookup = makeObjectFromEntries(
    await promiseMap(sourceDatasetIds, async (datasetId) => {
      const entry = await LocalDatasetEntryClient.getById({ id: datasetId });
      return [datasetId, entry?.localTableName] as const;
    }),
  );

  // get all columns that we need to extract values from
  const sourceDatasetColumns = await DatasetColumnClient.getAll(
    where(
      "id",
      "in",
      datasetColumnValueExtractors.map(getProp("datasetFieldId")),
    ),
  );
  const columnsById = makeObject(sourceDatasetColumns, { key: "id" });

  // map each extractor to its column and table name
  const extractorColumnsLookup = makeObject(datasetColumnValueExtractors, {
    key: "id",
    valueFn: (extractor) => {
      const localTableName = localTableNameLookup[extractor.datasetId];
      const column = columnsById[extractor.datasetFieldId];
      assertIsDefined(
        localTableName,
        `Could not find local table name for dataset "${extractor.datasetId}"`,
      );
      assertIsDefined(
        column,
        `Could not find column "${extractor.datasetFieldId}"`,
      );
      return {
        column,
        tableName: localTableName,
      };
    },
  });

  // 2. Get the dataset columns to use for external IDs and the entity title
  const primaryKeyExtractors = datasetColumnValueExtractors.filter(
    (extractor) => {
      return primaryKeyFields.some(propIs("id", extractor.entityFieldConfigId));
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
      primaryKeyExtractorsByDatasetId[titleColumn.column.datasetId]!.id
    ]!.column;

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
          const { column, tableName } = extractorColumnsLookup[extractor.id]!;
          return `SELECT "${column.name}" AS external_id FROM "${tableName}"`;
        })
        .join(" UNION ALL "),
      titleSelector: getSQLSelectOfExtractor({
        selectColumnName: titleColumn.column.name,
        primaryKeyColumnName: titleDatasetPrimaryKeyColumn.name,
        tableName: titleColumn.tableName,
        ruleType: titleExtractor.valuePickerRuleType,
        outputColumnName: "name",
        externalIdsTable: "external_ids",
        externalIdsColumn: "external_id",
      }),
    },
  });

  // 3. Now upload all data to Supabase
  // TODO(jpsyx): NOTE: this will do an upsert on all rows. There is definitely
  // optimization that can be done to only upsert new rows or rows that have
  // a new name. There is no need to upsert rows that already exist and have
  // not changed.
  const jobSummary = await DuckDBClient.forEachQueryPage<Entity<"DBRead">>(
    { tableName: entityConfig.id, castTimestampsToISO: true },
    async (page) => {
      Logger.log("page", page);
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
