import { match } from "ts-pattern";
import { BaseClient, createBaseClient } from "@/lib/clients/BaseClient";
import { withLogger, WithLogger } from "@/lib/clients/withLogger";
import { WithQueryHooks } from "@/lib/clients/withQueryHooks/types";
import { withQueryHooks } from "@/lib/clients/withQueryHooks/withQueryHooks";
import { ILogger } from "@/lib/Logger";
import { RegistryOfArrays } from "@/lib/types/utilityTypes";
import { assertIsDefined } from "@/lib/utils/asserts";
import { where } from "@/lib/utils/filters/filterBuilders";
import { isDefined } from "@/lib/utils/guards";
import {
  makeBucketRecordFromList,
  makeIdLookupRecord,
} from "@/lib/utils/objects/builders";
import { getProp } from "@/lib/utils/objects/higherOrderFuncs";
import { objectEntries, objectKeys } from "@/lib/utils/objects/misc";
import { promiseFlatMap, promiseMap } from "@/lib/utils/promises";
import { makeSet } from "@/lib/utils/sets/builders";
import { isInSet } from "@/lib/utils/sets/higherOrderFuncs";
import { wrapString } from "@/lib/utils/strings/higherOrderFuncs";
import { uuid } from "@/lib/utils/uuid";
import { EntityId } from "@/models/entities/Entity";
import { EntityFieldConfigClient } from "@/models/EntityConfig/EntityFieldConfig/EntityFieldConfigClient";
import {
  EntityFieldConfig,
  EntityFieldConfigId,
} from "@/models/EntityConfig/EntityFieldConfig/types";
import { EntityFieldValueExtractorRegistry } from "@/models/EntityConfig/ValueExtractor/types";
import { DatasetColumnClient } from "../datasets/DatasetColumnClient";
import { DatasetRawDataClient } from "../datasets/DatasetRawDataClient";
import { LocalDatasetEntryClient } from "../datasets/LocalDatasetEntryClient";
import { singleton } from "../DuckDBClient/queryResultHelpers";
import { EntityClient } from "./EntityClient";
import type { EntityFieldValue } from "@/models/entities/EntityFieldValue";

type EntityFieldValueClientQueries = {
  getEntityFieldValues: (params: {
    entityId: EntityId;
    entityFieldConfigs: readonly EntityFieldConfig[];
  }) => Promise<EntityFieldValue[]>;
};

export type IEntityFieldValueClient = BaseClient &
  EntityFieldValueClientQueries;

function createEntityFieldValueClient(): WithLogger<
  WithQueryHooks<
    IEntityFieldValueClient,
    keyof EntityFieldValueClientQueries,
    never
  >
> {
  const baseClient = createBaseClient("DatasetRawData");
  return withLogger(baseClient, (baseLogger: ILogger) => {
    const queries = {
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
        const valueExtractorsByType = makeBucketRecordFromList(
          valueExtractors,
          { keyFn: getProp("type") },
        ) as RegistryOfArrays<EntityFieldValueExtractorRegistry>;

        // bucket the extractors by field id
        const valueExtractorsByFieldId = makeIdLookupRecord(valueExtractors, {
          key: "entityFieldConfigId",
        });

        const fieldValues = await promiseFlatMap(
          objectKeys(valueExtractorsByType),
          async (extractorType) => {
            logger.log("Processing extractor", extractorType);
            return match(extractorType)
              .with("aggregation", (type) => {
                throw new Error(
                  `Extracting ${type} types are not supported yet.`,
                );
              })
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
                    where(
                      "id",
                      "in",
                      extractors.map(getProp("datasetFieldId")),
                    ),
                  ),
                  { key: "id" },
                );

                // Each extractor corresponds to 1 dataset, but there can be
                // duplicate datasets, so let's bucket them by dataset.
                // Each of these buckets should include a primary key
                // extractor already.
                const extractorsByDatasetId = makeBucketRecordFromList(
                  extractors,
                  { keyFn: getProp("datasetId") },
                );

                // run a query for each dataset
                const datasetColumnFieldValues = await promiseMap(
                  objectEntries(extractorsByDatasetId),
                  async ([datasetId, datasetExtractors]) => {
                    const columns = datasetExtractors.map((ext) => {
                      return datasetColumnsById[ext.datasetFieldId]!;
                    });
                    const pkeyExtractor =
                      primaryKeyExtractorsByDatasetId[datasetId]!;
                    const pkeyColumn =
                      datasetColumnsById[pkeyExtractor.datasetFieldId]!;
                    const localDatasetEntry =
                      await LocalDatasetEntryClient.getById({ id: datasetId });
                    assertIsDefined(
                      localDatasetEntry,
                      "Dataset not found locally",
                    );
                    const columnNames = columns.map(getProp("name"));
                    const requestedExtractors = datasetExtractors.filter(
                      isInSet(requestedFieldIds, {
                        key: "entityFieldConfigId",
                      }),
                    );

                    const extractedValues = singleton(
                      await DatasetRawDataClient.runLocalRawQuery<
                        Record<EntityFieldConfigId, unknown>
                      >({
                        dependencies: [datasetId],
                        query: `
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
                        `,
                        queryArgs: {
                          columnNames: columnNames
                            .map(wrapString('"'))
                            .join(", "),
                          datasetTableName: localDatasetEntry.localTableName,
                          primaryKeyColumnName: pkeyColumn.name,
                          externalId: entity.externalId,
                          columnNameValueSelectors: requestedExtractors
                            .map((ext) => {
                              const column =
                                datasetColumnsById[ext.datasetFieldId]!;
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
                                .exhaustive();
                            })
                            .join(", "),
                        },
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
                      const valueStr = rawValue ? String(rawValue) : undefined;
                      return {
                        id: uuid(),
                        entityId,
                        datasetId,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        entityFieldConfigId: fieldConfigId,
                        entityConfigId: entity.entityConfigId,
                        workspaceId: entity.workspaceId,
                        value: valueStr,

                        // TODO(jpsyx): this should have been extracted too
                        valueSet: [valueStr].filter(isDefined),
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
