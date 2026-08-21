import { createServiceClient } from "@avandar/clients";
import { withLogger } from "@avandar/logger";
import { withQueryHooks } from "@avandar/query-hooks";
import {
  assertIsDefined,
  isDefined,
  makeBucketRecord,
  makeIdLookupRecord,
  makeSet,
  objectEntries,
  objectKeys,
  promiseFlatMap,
  promiseMap,
  prop,
  sqlTemplate,
  where,
} from "@avandar/utils";
import { wrapString } from "$/lib/strings/higherOrderFuncs";
import { uuid } from "$/lib/uuid";
import { AttributeAssertionRead } from "$/models/ontology/AttributeAssertion/AttributeAssertion.types";
import {
  ConceptAttributeId,
  ConceptAttributeModel,
} from "$/models/ontology/ConceptAttribute/ConceptAttribute.types";
import { match } from "ts-pattern";
import { DatasetColumnClient } from "@/clients/datasets/DatasetColumnClient";
import { getRowNumberedViewName } from "@/clients/DuckDbClient/duckDbSqlText";
import { singleton } from "@/clients/DuckDbClient/queryResultHelpers";
import { getAttributeAssertions } from "@/clients/ontology/AttributeAssertionClient/getAttributeAssertions/getAttributeAssertions";
import { ConceptAttributeClient } from "@/clients/ontology/ConceptAttributeClient";
import { IndividualClient } from "@/clients/ontology/IndividualClient";
import { WorkspaceQuerySession } from "@/clients/qetl/WorkspaceQuerySession/WorkspaceQuerySession";
import { isInSet } from "@/lib/utils/sets/higherOrderFuncs";
import type { ServiceClient } from "@avandar/clients";
import type { ILogger, WithLogger } from "@avandar/logger";
import type { WithQueryHooks } from "@avandar/query-hooks";
import type { RegistryOfArrays } from "@avandar/utils";
import type { AttributeAssertion } from "$/models/ontology/AttributeAssertion/AttributeAssertion";
import type { AttributeMappingRegistry } from "$/models/ontology/AttributeMapping/AttributeMapping.types";
import type { ConceptId } from "$/models/ontology/Concept/Concept.types";
import type { ConceptAttribute } from "$/models/ontology/ConceptAttribute/ConceptAttribute";
import type { IndividualId } from "$/models/ontology/Individual/Individual.types";
import type { Workspace } from "$/models/Workspace/Workspace";

type AttributeAssertionClientQueries = {
  getConceptExtension: (params: {
    conceptId: ConceptId;
    conceptAttributes: readonly ConceptAttribute.T[];
    workspaceId: Workspace.Id;
  }) => Promise<Array<Record<ConceptAttribute.Id, unknown>>>;

  getAttributeAssertions: (params: {
    individualId: IndividualId;
    conceptAttributes: readonly ConceptAttribute.T[];
    workspaceId: Workspace.Id;
  }) => Promise<AttributeAssertion.T[]>;
};

export type IAttributeAssertionClient = ServiceClient &
  AttributeAssertionClientQueries;

function createAttributeAssertionClient(): WithLogger<
  WithQueryHooks<
    IAttributeAssertionClient,
    keyof AttributeAssertionClientQueries,
    never
  >
> {
  const baseClient = createServiceClient("DatasetRawDataClient");
  return withLogger(baseClient, (baseLogger: ILogger) => {
    const queries = {
      getConceptExtension: async (params: {
        conceptId: ConceptId;
        conceptAttributes: ReadonlyArray<ConceptAttributeModel["Read"]>;
        workspaceId: Workspace.Id;
      }): Promise<Array<Record<ConceptAttributeId, unknown>>> => {
        const logger = baseLogger.appendName("getConceptExtension");
        logger.log("Getting the concept extension from query", params);
        const allAssertions = await getAttributeAssertions({
          conceptId: params.conceptId,
          conceptAttributes: params.conceptAttributes,
          workspaceId: params.workspaceId,
        });
        logger.log("Got the concept extension", allAssertions);
        return allAssertions;
      },

      getAttributeAssertions: async (params: {
        individualId: IndividualId;
        conceptAttributes: ReadonlyArray<ConceptAttributeModel["Read"]>;
      }): Promise<AttributeAssertionRead[]> => {
        const logger = baseLogger.appendName("getAttributeAssertions");
        logger.log("Getting attribute assertions", params);

        const { individualId, conceptAttributes } = params;

        // base case: empty attributes array
        if (conceptAttributes.length === 0) {
          return [];
        }

        const individual = await IndividualClient.getById({ id: individualId });
        assertIsDefined(individual, "Individual not found");

        // get the ID attributes that also have dataset value mappings.
        // we will need these to do other dataset queries, because we will
        // need to know which columns to look at for the primary key
        const identifierAttributes = await ConceptAttributeClient.getAll({
          where: {
            concept_id: { eq: individual.conceptId },
            is_identifier: { eq: true },
            mapping_type: { eq: "dataset_column" },
          },
        });

        // get the ids of the attributes that were actually requested
        const requestedAttributeIds = makeSet(conceptAttributes, { key: "id" });

        // get every mapping, including the identifier mappings (which may
        // not have been explicitly requested, but we cannot join datasets
        // without them)
        const mappings = await ConceptAttributeClient.getAllAttributeMappings({
          attributes: conceptAttributes.concat(identifierAttributes),
        });

        // bucket the mappings by type
        const mappingsByType = makeBucketRecord(mappings, {
          keyFn: prop("type"),
        }) as RegistryOfArrays<AttributeMappingRegistry>;

        // bucket the mappings by attribute id
        const mappingsByAttributeId = makeIdLookupRecord(mappings, {
          key: "conceptAttributeId",
        });

        const assertions = await promiseFlatMap(
          objectKeys(mappingsByType),
          async (mappingType) => {
            logger.log("Processing mapping", mappingType);
            return match(mappingType)
              .with("manual_entry", (type) => {
                throw new Error(`${type} mappings are not supported yet.`);
              })
              .with("dataset_column", async (type) => {
                const datasetColumnMappings = mappingsByType[type];
                const identifierMappings = identifierAttributes
                  .map((attribute) => {
                    const mapping = mappingsByAttributeId[attribute.id];
                    return mapping?.type === "dataset_column" ?
                        mapping
                      : undefined;
                  })
                  .filter(isDefined);
                const identifierMappingsByDatasetId = makeIdLookupRecord(
                  identifierMappings,
                  { key: "datasetId" },
                );

                // Get all metadata of the columns we need to extract
                const datasetColumnsById = makeIdLookupRecord(
                  await DatasetColumnClient.getAll(
                    where(
                      "id",
                      "in",
                      datasetColumnMappings.map(prop("datasetColumnId")),
                    ),
                  ),
                  { key: "id" },
                );

                // Each mapping corresponds to 1 dataset, but there can be
                // duplicate datasets, so let's bucket them by dataset.
                // Each of these buckets should include an identifier
                // mapping already.
                const mappingsByDatasetId = makeBucketRecord(
                  datasetColumnMappings,
                  { keyFn: prop("datasetId") },
                );

                // run a query for each dataset
                const datasetColumnAssertions = await promiseMap(
                  objectEntries(mappingsByDatasetId),
                  async ([datasetId, datasetMappings]) => {
                    const columns = datasetMappings.map((ext) => {
                      return datasetColumnsById[ext.datasetColumnId]!;
                    });
                    const identifierMapping =
                      identifierMappingsByDatasetId[datasetId]!;
                    const pkeyColumn =
                      datasetColumnsById[identifierMapping.datasetColumnId]!;
                    const columnNames = columns.map(prop("name"));
                    const requestedMappings = datasetMappings.filter(
                      isInSet(requestedAttributeIds, {
                        key: "conceptAttributeId",
                      }),
                    );

                    const extractedValues = singleton(
                      await WorkspaceQuerySession.runQuery<
                        Record<ConceptAttributeId, unknown>
                      >({
                        workspaceId: individual.workspaceId,
                        rawSql: sqlTemplate(`
                          -- Get all rows matching this external_id.
                          -- Reads the auxiliary row-numbered view, not the
                          -- dataset's public view, so \`file_row_number\` is
                          -- available: it is what makes the \`first\` rule
                          -- deterministic instead of an unordered LIMIT 1.
                          WITH individual_rows AS (
                            SELECT
                              $columnNames$,
                              file_row_number
                            FROM "$rowNumberedViewName$"
                            WHERE "$primaryKeyColumnName$" = '$externalId$'
                          )

                          -- Get all the values
                          SELECT
                            $columnNameValueSelectors$;
                        `).parse({
                          columnNames: columnNames
                            .map(wrapString('"'))
                            .join(", "),
                          rowNumberedViewName:
                            getRowNumberedViewName(datasetId),
                          primaryKeyColumnName: pkeyColumn.name,
                          externalId: individual.externalId,
                          columnNameValueSelectors: requestedMappings
                            .map((ext) => {
                              const column =
                                datasetColumnsById[ext.datasetColumnId]!;
                              const colName = column.name;
                              const attributeId = ext.conceptAttributeId;
                              return match(ext)
                                .with({ valuePickerRuleType: "first" }, () => {
                                  // ORDER BY is the correctness fix, not a
                                  // preference: without it this is LIMIT 1 over
                                  // an unordered scan and the value changes
                                  // between page loads with no data change.
                                  return `
                                      -- Get the first value, deterministically
                                      (SELECT "${colName}"
                                      FROM individual_rows
                                      ORDER BY file_row_number
                                      LIMIT 1) AS "${attributeId}"
                                    `;
                                })
                                .with(
                                  { valuePickerRuleType: "most_frequent" },
                                  () => {
                                    // The tie-break matters: COUNT(*) DESC
                                    // alone is non-deterministic whenever two
                                    // values are equally frequent. Matches
                                    // `getSQLSelectOfMapping`; the two copies
                                    // must agree on a tie.
                                    return `
                                      -- Get the most frequent value
                                      (SELECT "${colName}"
                                      FROM individual_rows
                                      WHERE "${colName}" IS NOT NULL
                                      GROUP BY "${colName}"
                                      ORDER BY COUNT(*) DESC, "${colName}"
                                      LIMIT 1) AS "${attributeId}"
                                    `;
                                  },
                                )
                                .with({ valuePickerRuleType: "sum" }, () => {
                                  return `
                                    -- Get the sum of the values
                                    (SELECT CAST(SUM("${colName}") AS DOUBLE)
                                    FROM individual_rows) AS "${attributeId}"
                                  `;
                                })
                                .with({ valuePickerRuleType: "avg" }, () => {
                                  return `
                                    -- Get the average of the values
                                    (SELECT CAST(AVG("${colName}") AS DOUBLE)
                                    FROM individual_rows) AS "${attributeId}"
                                  `;
                                })
                                .with({ valuePickerRuleType: "count" }, () => {
                                  return `
                                    -- Get the count of the values
                                    (SELECT CAST(COUNT("${colName}") AS DOUBLE)
                                    FROM individual_rows) AS "${attributeId}"
                                  `;
                                })
                                .with({ valuePickerRuleType: "max" }, () => {
                                  return `
                                    -- Get the maximum value
                                    (SELECT CAST(MAX("${colName}") AS DOUBLE)
                                    FROM individual_rows) AS "${attributeId}"
                                  `;
                                })
                                .with({ valuePickerRuleType: "min" }, () => {
                                  return `
                                    -- Get the minimum value
                                    (SELECT CAST(MIN("${colName}") AS DOUBLE)
                                    FROM individual_rows) AS "${attributeId}"
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
                    const attributeAssertions: AttributeAssertionRead[] =
                      objectKeys(extractedValues).map((attributeId) => {
                        const rawValue = extractedValues[attributeId];
                        return {
                          id: uuid(),
                          individualId,
                          datasetId,
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                          conceptAttributeId: attributeId,
                          conceptId: individual.conceptId,
                          workspaceId: individual.workspaceId,
                          value: rawValue,

                          // TODO(jpsyx): this should have been extracted too
                          valueSet: [rawValue].filter(isDefined),
                        };
                      });

                    return attributeAssertions;
                  },
                );

                logger.log(`Finished dataset_column attribute extractions`, {
                  mappingType,
                  datasetColumnAssertions,
                });

                return datasetColumnAssertions.flat();
              })
              .exhaustive();
          },
        );

        logger.log("Retrieved requested attribute values", assertions);

        return assertions;
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

export const AttributeAssertionClient = createAttributeAssertionClient();
