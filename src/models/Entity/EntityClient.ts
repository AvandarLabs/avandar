// TODO(jpsyx): this is all very hacky right now
import { z } from "zod";
import { EntityFieldValue } from "@/components/EntityDesignerApp/EntityConfigMetaView/generateEntities/pipeline-runner/runPipeline";
import {
  createModelCRUDClient,
  ModelCRUDClient,
} from "@/lib/clients/ModelCRUDClient";
import { ILogger } from "@/lib/Logger";
import { applyFiltersToRows } from "@/lib/utils/filters/applyFiltersToRows";
import { FiltersByColumn } from "@/lib/utils/filters/filtersByColumn";
import { propEquals } from "@/lib/utils/objects/higherOrderFuncs";
import { brandedStringType, uuidType } from "@/lib/utils/zodHelpers";
import { EntityConfigId } from "../EntityConfig/types";
import { LocalDatasetClient } from "../LocalDataset/LocalDatasetClient";
import { LocalDatasetId, ParsedLocalDataset } from "../LocalDataset/types";
import { WorkspaceId } from "../Workspace/types";
import { EntityParsers } from "./parsers";
import { Entity, EntityId, EntityModel } from "./types";

const EntityFieldValueNativeType = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.undefined(),
]);

export const EntityFieldValueReadSchema = z.object({
  id: uuidType<"EntityFieldValue">(),
  workspaceId: uuidType<WorkspaceId>(),
  entityId: uuidType<"Entity">(),
  entityFieldConfigId: uuidType<"EntityFieldConfig">(),
  value: EntityFieldValueNativeType,
  valueSet: z.string().transform((value) => {
    return value.split(";");
  }),
  datasourceId: brandedStringType<LocalDatasetId>(),
});

export type EntityFieldValueRead = EntityFieldValue;

type EntityDatasets = {
  entityDataset: ParsedLocalDataset;
  fieldValuesDataset: ParsedLocalDataset;
};

type AdditionalEntityQueries = {
  getAllFields: (params: {
    entityId: EntityId;
  }) => Promise<EntityFieldValueRead[]>;
};

type EntityClient = ModelCRUDClient<EntityModel, AdditionalEntityQueries>;

function createEntityClient(entityConfigId: EntityConfigId): EntityClient {
  const state: Partial<EntityDatasets> = {
    entityDataset: undefined,
    fieldValuesDataset: undefined,
  };

  async function _getEntityDataset(): Promise<ParsedLocalDataset> {
    if (state.entityDataset) {
      return state.entityDataset;
    }

    const allDatasets = await LocalDatasetClient.getAll();
    const entityDatasets = allDatasets.filter((dataset) => {
      return (
        dataset.datasetType === "entities" &&
        dataset.id.includes(entityConfigId)
      );
    });

    if (entityDatasets.length === 0) {
      throw new Error(`Datasets for entity ${entityConfigId} not found`);
    }

    if (entityDatasets.length > 1) {
      throw new Error(`Multiple datasets found for entity ${entityConfigId}`);
    }

    // now hydrate the dataset
    const entityDataset = await LocalDatasetClient.hydrateDataset({
      dataset: entityDatasets[0]!,
    });

    state.entityDataset = entityDataset;
    return entityDataset;
  }

  async function _getFieldValuesDataset(): Promise<ParsedLocalDataset> {
    if (state.fieldValuesDataset) {
      return state.fieldValuesDataset;
    }

    const allDatasets = await LocalDatasetClient.getAll();
    const fieldValueDatasets = allDatasets.filter((dataset) => {
      return (
        dataset.datasetType === "entity_field_values" &&
        dataset.id.includes(entityConfigId)
      );
    });

    if (fieldValueDatasets.length === 0) {
      throw new Error(
        `Field value datasets for entity ${entityConfigId} not found`,
      );
    }

    if (fieldValueDatasets.length > 1) {
      throw new Error(
        `Multiple field value datasets found for entity ${entityConfigId}`,
      );
    }
    // now hydrate the dataset
    const fieldValuesDataset = await LocalDatasetClient.hydrateDataset({
      dataset: fieldValueDatasets[0]!,
    });

    state.fieldValuesDataset = fieldValuesDataset;
    return fieldValuesDataset;
  }

  async function getById(params: {
    id: EntityId | null | undefined;
    logger: ILogger;
  }) {
    // TODO(jpsyx): use DuckDB WASM here to speed this up
    if (!params.id) {
      return undefined;
    }

    const entityDataset = await _getEntityDataset();
    const entity = entityDataset.data.find(propEquals("id", params.id));
    return EntityParsers.DBReadSchema.parse(entity);
  }

  // copy the LocalDatasetClient
  return createModelCRUDClient({
    modelName: "Entity",
    parsers: EntityParsers,

    // `Get` queries
    getById,
    getCount: async (params: {
      where?: FiltersByColumn<Entity<"DBRead">>;
      logger: ILogger;
    }) => {
      // TODO(jpsyx): use DuckDB WASM here to speed this up
      const { where } = params;
      const entityDataset = await _getEntityDataset();
      const filteredRows =
        where ?
          applyFiltersToRows(
            entityDataset.data as unknown as Array<Entity<"DBRead">>,
            where,
          )
        : entityDataset.data;
      return filteredRows.length;
    },

    getPage: async (params: {
      where?: FiltersByColumn<Entity<"DBRead">>;
      pageSize: number;
      pageNum: number;
      logger: ILogger;
    }) => {
      // TODO(jpsyx): use DuckDB WASM here to speed this up
      const { where, pageSize, pageNum } = params;
      const entityDataset = await _getEntityDataset();
      const filteredRows =
        where ?
          applyFiltersToRows(
            entityDataset.data as unknown as Array<Entity<"DBRead">>,
            where,
          )
        : entityDataset.data;

      const dbRows = filteredRows
        .slice(pageNum * pageSize, (pageNum + 1) * pageSize)
        .map((row) => {
          return EntityParsers.DBReadSchema.parse(row);
        });
      return dbRows;
    },

    // Mutations
    insert: (_params: { data: Entity<"DBInsert">; logger: ILogger }) => {
      throw new Error("Not implemented");
    },

    bulkInsert: (_params: {
      data: ReadonlyArray<Entity<"DBInsert">>;
      logger: ILogger;
    }) => {
      throw new Error("Not implemented");
    },

    update: (_params: {
      id: EntityId;
      data: Entity<"DBUpdate">;
      logger: ILogger;
    }) => {
      throw new Error("Not implemented");
    },

    delete: (_params: { id: EntityId; logger: ILogger }) => {
      throw new Error("Not implemented");
    },

    bulkDelete: (_params: { ids: readonly EntityId[]; logger: ILogger }) => {
      throw new Error("Not implemented");
    },

    additionalQueries: ({ clientLogger }) => {
      return {
        getAllFields: async (params: {
          entityId: EntityId;
        }): Promise<EntityFieldValueRead[]> => {
          const { entityId } = params;
          const logger = clientLogger.appendName("getAllFields");
          const entity = await getById({ id: entityId, logger });

          if (entity) {
            const fieldValuesDataset = await _getFieldValuesDataset();

            // pick only the field values that belong to the requested entity
            const filteredRows = applyFiltersToRows(fieldValuesDataset.data, {
              entityId: { eq: entity.id },
            });

            const entityFieldValues = filteredRows.map((row) => {
              return EntityFieldValueReadSchema.parse(row);
            });

            logger.log(
              `Parsed entity fields (count: ${entityFieldValues.length})`,
            );
            return entityFieldValues;
          }
          return [];
        },
      };
    },
  }) as ModelCRUDClient<EntityModel, AdditionalEntityQueries>;
}

const entityClientMap = new Map<EntityConfigId, EntityClient>();

export const EntityClient = {
  ofType: (entityConfigId: EntityConfigId): EntityClient => {
    const cachedClient = entityClientMap.get(entityConfigId);
    if (cachedClient) {
      return cachedClient;
    }

    const newClient = createEntityClient(entityConfigId);
    entityClientMap.set(entityConfigId, newClient);
    return newClient;
  },
};
