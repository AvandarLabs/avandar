import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { DatasetRawDataClient } from "@/clients/datasets/DatasetRawDataClient";
import { LocalDatasetEntryClient } from "@/clients/datasets/LocalDatasetEntryClient";
import { DuckDBClient } from "@/clients/DuckDBClient";
import { EntityClient } from "@/clients/entities/EntityClient";
import { Logger } from "@/lib/Logger";
import { assertIsDefined } from "@/lib/utils/asserts";
import { where } from "@/lib/utils/filters/filterBuilders";
import { isDefined } from "@/lib/utils/guards";
import {
  makeObjectFromEntries,
  makeObjectFromList,
} from "@/lib/utils/objects/builders";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { promiseMap } from "@/lib/utils/promises";
import { Entity } from "@/models/entities/Entity";
import { EntityConfigModule } from "@/models/EntityConfig";
import { BuildableEntityConfig } from "./pipelineTypes";

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
  const columnsById = makeObjectFromList(sourceDatasetColumns, { key: "id" });

  // map each extractor to its column and table name
  const extractorColumnsLookup = makeObjectFromList(
    datasetColumnValueExtractors,
    {
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
    },
  );

  // 2. Get the dataset columns to use for external IDs and the entity title
  const primaryKeyExtractors = datasetColumnValueExtractors.filter(
    (extractor) => {
      return extractor.entityFieldConfigId !== titleField.id;
    },
  );
  const titleExtractor = datasetColumnValueExtractors.find((extractor) => {
    return extractor.entityFieldConfigId === titleField.id;
  })!;
  const primaryKeyExtractorsByDatasetId = makeObjectFromList(
    primaryKeyExtractors,
    { key: "datasetId" },
  );
  const titleColumn = extractorColumnsLookup[titleExtractor.id]!;

  await DatasetRawDataClient.runLocalRawQuery({
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
          t."$titleColumnName$" AS name
        FROM external_ids e
          LEFT JOIN "$titleTableName$" t ON e.external_id = t."$titleTableNamePrimaryKey$"
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
      titleTableName: titleColumn.tableName,
      titleColumnName: titleColumn.column.name,
      titleTableNamePrimaryKey:
        extractorColumnsLookup[
          primaryKeyExtractorsByDatasetId[titleColumn.column.datasetId]!.id
        ]!.column.name,
    },
    dependencies: sourceDatasetIds,
  });

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
