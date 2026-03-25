import { createServiceClient } from "@clients/ServiceClient/createServiceClient";
import { withQueryHooks } from "@hooks/withQueryHooks/withQueryHooks";
import { withLogger } from "@logger/module-augmenters/withLogger";
import { assertIsDefined } from "@utils/asserts/assertIsDefined/assertIsDefined";
import { where } from "@utils/filters/where/where";
import { isDefined } from "@utils/guards/isDefined/isDefined";
import { prop } from "@utils/objects/hofs/prop/prop";
import { makeBucketRecord } from "@utils/objects/makeBucketRecord/makeBucketRecord";
import { makeIdLookupRecord } from "@utils/objects/makeIdLookupRecord/makeIdLookupRecord";
import { objectEntries } from "@utils/objects/objectEntries";
import { objectKeys } from "@utils/objects/objectKeys";
import { template } from "@utils/strings/template/template";
import { wrapString } from "$/lib/strings/higherOrderFuncs";
import { uuid } from "$/lib/uuid";
import { match } from "ts-pattern";
import { EntityFieldConfigClient } from "@/clients/entities/EntityFieldConfigClient";
import { WorkspaceQETLClient } from "@/clients/qetl/WorkspaceQETLClient";
import { promiseFlatMap, promiseMap } from "@/lib/utils/promises";
import { makeSet } from "@/lib/utils/sets/builders";
import { isInSet } from "@/lib/utils/sets/higherOrderFuncs";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { singleton } from "@/clients/DuckDBClient/queryResultHelpers";
import { EntityClient } from "@/clients/entities/EntityClient";
import { getEntityFieldValues } from "@/clients/entities/EntityFieldValueClient/getEntityFieldValues/getEntityFieldValues";
import type { ServiceClient } from "@clients/ServiceClient/ServiceClient.types";
import type { WithQueryHooks } from "@hooks/withQueryHooks/withQueryHooks.types";
import type { ILogger, WithLogger } from "@logger/Logger.types";
import type { RegistryOfArrays } from "@utils/types/utilities.types";
import type { EntityId } from "$/models/entities/Entity/Entity.types";
import type { EntityFieldValue } from "$/models/entities/EntityFieldValue/EntityFieldValue.types";
import type { EntityConfigId } from "$/models/EntityConfig/EntityConfig.types";
import type {
  EntityFieldConfig,
  EntityFieldConfigId,
} from "$/models/EntityConfig/EntityFieldConfig/EntityFieldConfig.types";
import type { EntityFieldValueExtractorRegistry } from "$/models/EntityConfig/ValueExtractor/ValueExtractor.types";
import type { Workspace } from "$/models/Workspace/Workspace";

type EntityFieldValueClientQueries = {
  getAllEntityFieldValues: (params: {
    entityConfigId: EntityConfigId;
    entityFieldConfigs: readonly EntityFieldConfig[];
    workspaceId: Workspace.Id;
  }) => Promise<Array<Record<EntityFieldConfigId, unknown>>>;

  getEntityFieldValues: (params: {
    entityId: EntityId;
    entityFieldConfigs: readonly EntityFieldConfig[];
    workspaceId: Workspace.Id;
  }) => Promise<EntityFieldValue[]>;
};

export type IEntityFieldValueClient = ServiceClient &
  EntityFieldValueClientQueries;

function createEntityFieldValueClient(): WithLogger<
  WithQueryHooks<
    IEntityFieldValueClient,
    keyof EntityFieldValueClientQueries,
    never
  >
> {
  const baseClient = createServiceClient("DatasetRawDataClient");
  return withLogger(baseClient, (baseLogger: ILogger) => {
    const queries = {
      getAllEntityFieldValues: async (params: {
        entityConfigId: EntityConfigId;
        entityFieldConfigs: readonly EntityFieldConfig[];
        workspaceId: Workspace.Id;
      }): Promise<Array<Record<EntityFieldConfigId, unknown>>> => {
        const logger = baseLogger.appendName("getAllEntityFieldValues");
        logger.log("Getting all entity field values from query", params);
        const allFieldValues = await getEntityFieldValues({
          entityConfigId: params.entityConfigId,
          entityFieldConfigs: params.entityFieldConfigs,
          workspaceId: params.workspaceId,
        });
        logger.log("Got all entity field values", allFieldValues);
        return allFieldValues;
      },

      getEntityFieldValues: async (params: {
        entityId: EntityId;
        entityFieldConfigs: readonly EntityFieldConfig[];
      }): Promise<EntityFieldValue[]> => {
        const logger = baseLogger.appendName("getEntityFieldValues");
        logger.log("Getting entity field values", params);

        const { entityId, entityFieldConfigs } = params;

        // base case: empty fields array
        if (entityFieldConfigs.length === 0) {
          return [];
        }

        const entity = await EntityClient.getById({ id: entityId });
        assertIsDefined(entity, "Entity not found");

        // get the ID fields that also have dataset value extractors.
        // we will need these to do other dataset queries, because we will
        // need to know which columns to look at for the primary key
        const primaryKeyFields = await EntityFieldConfigClient.getAll({
          where: {
            entity_config_id: { eq: entity.entityConfigId },
            is_id_field: { eq: true },
            value_extractor_type: { eq: "dataset_column_value" },
          },
        });

        // get all the value extractors from the requested fields
        const requestedFieldIds = makeSet(entityFieldConfigs, { key: "id" });

        // get all value extractors, including the primary key extractors (which
        // may not have been explicitly requested, but we cannot join datasets
        // without them)
        const valueExtractors =
          await EntityFieldConfigClient.getAllValueExtractors({
            fields: entityFieldConfigs.concat(primaryKeyFields),
          });

        // bucket the extractors by type
        const valueExtractorsByType = makeBucketRecord(valueExtractors, {
          keyFn: prop("type"),
        }) as RegistryOfArrays<EntityFieldValueExtractorRegistry>;

        // bucket the extractors by field id
        const valueExtractorsByFieldId = makeIdLookupRecord(valueExtractors, {
          key: "entityFieldConfigId",
        });

        const fieldValues = await promiseFlatMap(
          objectKeys(valueExtractorsByType),
          async (extractorType) => {
            logger.log("Processing extractor", extractorType);
            return match(extractorType)
              .with("manual_entry", (type) => {
                throw new Error(
                  `Extracting ${type} types are not supported yet.`,
                );
              })
              .with("dataset_column_value", async (type) => {
                const extractors = valueExtractorsByType[type];
                const primaryKeyExtractors = primaryKeyFields
                  .map((field) => {
                    const extractor = valueExtractorsByFieldId[field.id];
                    return extractor?.type === "dataset_column_value" ?
                        extractor
                      : undefined;
                  })
                  .filter(isDefined);
                const primaryKeyExtractorsByDatasetId = makeIdLookupRecord(
                  primaryKeyExtractors,
                  { key: "datasetId" },
                );

                // Get all metadata of the columns we need to extract
                const datasetColumnsById = makeIdLookupRecord(
                  await DatasetColumnClient.getAll(
                    where("id", "in", extractors.map(prop("datasetColumnId"))),
                  ),
                  { key: "id" },
                );

                // Each extractor corresponds to 1 dataset, but there can be
                // duplicate datasets, so let's bucket them by dataset.
                // Each of these buckets should include a primary key
                // extractor already.
                const extractorsByDatasetId = makeBucketRecord(extractors, {
                  keyFn: prop("datasetId"),
                });

                // run a query for each dataset
                const datasetColumnFieldValues = await promiseMap(
                  objectEntries(extractorsByDatasetId),
                  async ([datasetId, datasetExtractors]) => {
                    const columns = datasetExtractors.map((ext) => {
                      return datasetColumnsById[ext.datasetColumnId]!;
                    });
                    const pkeyExtractor =
                      primaryKeyExtractorsByDatasetId[datasetId]!;
                    const pkeyColumn =
                      datasetColumnsById[pkeyExtractor.datasetColumnId]!;
                    const columnNames = columns.map(prop("name"));
                    const requestedExtractors = datasetExtractors.filter(
                      isInSet(requestedFieldIds, {
                        key: "entityFieldConfigId",
                      }),
                    );

                    const extractedValues = singleton(
                      await WorkspaceQETLClient.runQuery<
                        Record<EntityFieldConfigId, unknown>
                      >({
                        workspaceId: entity.workspaceId,
                        rawSQL: template(`
                          -- Get all rows matching this external_id
                          WITH entity_rows AS (
                            SELECT
                              $columnNames$
                            FROM "$datasetTableName$"
                            WHERE "$primaryKeyColumnName$" = '$externalId$'
                          )

                          -- Get all the values
                          SELECT
                            $columnNameValueSelectors$;
                        `).parse({
                          columnNames: columnNames
                            .map(wrapString('"'))
                            .join(", "),
                          datasetTableName: datasetId,
                          primaryKeyColumnName: pkeyColumn.name,
                          externalId: entity.externalId,
                          columnNameValueSelectors: requestedExtractors
                            .map((ext) => {
                              const column =
                                datasetColumnsById[ext.datasetColumnId]!;
                              const colName = column.name;
                              const fieldId = ext.entityFieldConfigId;
                              return match(ext)
                                .with({ valuePickerRuleType: "first" }, () => {
                                  return `
                                      -- Get the first value
                                      (SELECT "${colName}"
                                      FROM entity_rows
                                      LIMIT 1) AS "${fieldId}"
                                    `;
                                })
                                .with(
                                  { valuePickerRuleType: "most_frequent" },
                                  () => {
                                    return `
                                      -- Get the most frequent value
                                      (SELECT "${colName}"
                                      FROM entity_rows
                                      WHERE "${colName}" IS NOT NULL
                                      GROUP BY "${colName}"
                                      ORDER BY COUNT(*) DESC
                                      LIMIT 1) AS "${fieldId}"
                                    `;
                                  },
                                )
                                .with({ valuePickerRuleType: "sum" }, () => {
                                  return `
                                    -- Get the sum of the values
                                    (SELECT CAST(SUM("${colName}") AS DOUBLE)
                                    FROM entity_rows) AS "${fieldId}"
                                  `;
                                })
                                .with({ valuePickerRuleType: "avg" }, () => {
                                  return `
                                    -- Get the average of the values
                                    (SELECT CAST(AVG("${colName}") AS DOUBLE)
                                    FROM entity_rows) AS "${fieldId}"
                                  `;
                                })
                                .with({ valuePickerRuleType: "count" }, () => {
                                  return `
                                    -- Get the count of the values
                                    (SELECT CAST(COUNT("${colName}") AS DOUBLE)
                                    FROM entity_rows) AS "${fieldId}"
                                  `;
                                })
                                .with({ valuePickerRuleType: "max" }, () => {
                                  return `
                                    -- Get the maximum value
                                    (SELECT CAST(MAX("${colName}") AS DOUBLE)
                                    FROM entity_rows) AS "${fieldId}"
                                  `;
                                })
                                .with({ valuePickerRuleType: "min" }, () => {
                                  return `
                                    -- Get the minimum value
                                    (SELECT CAST(MIN("${colName}") AS DOUBLE)
                                    FROM entity_rows) AS "${fieldId}"
                                  `;
                                })
                                .exhaustive();
                            })
                            .join(", "),
                        }),
                      }),
                    );

                    logger.log("Finished extracting values from dataset", {
                      datasetId,
                      extractedValues,
                    });

                    assertIsDefined(extractedValues);
                    const entityFieldValues: EntityFieldValue[] = objectKeys(
                      extractedValues,
                    ).map((fieldConfigId) => {
                      const rawValue = extractedValues[fieldConfigId];
                      return {
                        id: uuid(),
                        entityId,
                        datasetId,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        entityFieldConfigId: fieldConfigId,
                        entityConfigId: entity.entityConfigId,
                        workspaceId: entity.workspaceId,
                        value: rawValue,

                        // TODO(jpsyx): this should have been extracted too
                        valueSet: [rawValue].filter(isDefined),
                      };
                    });

                    return entityFieldValues;
                  },
                );

                logger.log(`Finished dataset_column_value field extractions`, {
                  extractorType,
                  datasetColumnFieldValues,
                });

                return datasetColumnFieldValues.flat();
              })
              .exhaustive();
          },
        );

        logger.log("Retrieved requested field values", fieldValues);

        return fieldValues;
      },
    };

    return withQueryHooks(
      { ...baseClient, ...queries },
      {
        queryFns: objectKeys(queries),
        mutationFns: [],
      },
    );
  });
}

export const EntityFieldValueClient = createEntityFieldValueClient();
