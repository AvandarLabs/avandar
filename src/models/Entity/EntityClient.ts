// TODO(pablo): this is all very hacky right now
import { z } from "zod";
import {
  Entity,
  EntityFieldValue,
} from "@/components/EntityDesignerApp/EntityConfigMetaView/generateEntities/runPipeline";
import { BaseClient } from "@/lib/clients/BaseClient";
import { withQueryHooks } from "@/lib/clients/withQueryHooks";
import { UUID } from "@/lib/types/common";
import { applyFiltersToRows } from "@/lib/utils/filters/applyFiltersToRows";
import { propEquals } from "@/lib/utils/objects/higherOrderFuncs";
import { uuidType } from "@/lib/utils/zodHelpers";
import { EntityConfigId } from "../EntityConfig/types";
import { LocalDatasetClient } from "../LocalDataset/LocalDatasetClient";

export const EntityReadSchema = z.object({
  id: uuidType<"Entity">(),
  externalId: z.string(),
  name: z.string(),
  entityConfigId: uuidType<"EntityConfig">(),
  assignedTo: z.union([
    z.literal("").transform(() => {
      return null;
    }),
    uuidType<"User">(),
  ]),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const EntityFieldValueNativeType = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.undefined(),
]);

export const EntityFieldValueReadSchema = z.object({
  id: uuidType<"EntityFieldValue">(),
  entityId: uuidType<"Entity">(),
  entityFieldConfigId: uuidType<"EntityFieldConfig">(),
  value: EntityFieldValueNativeType,
  valueSet: z.string().transform((value) => {
    return value.split(";");
  }),
  datasourceId: uuidType<"LocalDataset">(),
});

export type EntityId = UUID<"Entity">;
export type EntityRead = Omit<Entity, "relationships">;
export type EntityFieldValueRead = EntityFieldValue;

const baseClient: BaseClient = {
  getClientName() {
    return "EntityClient";
  },
};

// we need to clean this up when we have proper models set up
export const EntityClient = withQueryHooks(
  {
    ...baseClient,
    getAllFields: async (params: {
      entityId: EntityId;
    }): Promise<EntityFieldValueRead[]> => {
      const entity = await EntityClient.getById({
        id: params.entityId,
      });

      if (entity) {
        const { entityConfigId } = entity;

        const datasets = await LocalDatasetClient.getAll();
        const filteredDatasets = applyFiltersToRows(datasets, {
          name: { eq: `entity_field_values__${entityConfigId}` },
        });

        if (filteredDatasets.length === 0) {
          return [];
        }

        // there should only be one, if not, choose the first one
        const entityValuesDataset = filteredDatasets[0];
        if (entityValuesDataset) {
          const parsedDataset = await LocalDatasetClient.hydrateDataset({
            dataset: entityValuesDataset,
          });

          // now we need to filter the rows to only include our entity id
          const filteredRows = applyFiltersToRows(parsedDataset.data, {
            entityId: { eq: entity.id },
          });

          const entityFieldValues = filteredRows.map((row) => {
            return EntityFieldValueReadSchema.parse(row);
          });
          return entityFieldValues;
        }
      }
      return [];
    },

    getById: async (params: {
      id: EntityId;
    }): Promise<EntityRead | undefined> => {
      // this is super hacky and not a good way of doing it.
      // we are just loading the dataset and doing an O(n) search for the entity
      // there is no querying going on here.
      // We should be using SQLite WASM for this part. Load the entity datasets
      // to SQLIte and query them that way
      const allEntities = await EntityClient.getAll();
      return allEntities.find(propEquals("id", params.id));
    },

    getAll: async (params?: {
      entityConfigId: EntityConfigId;
    }): Promise<EntityRead[]> => {
      // TODO(pablo): to filter by `name` you need to have it indexed
      // first. So we need to add an option to the Dexie client
      // to allow the user to specify what other fields to index by.
      // For now, we will do a hacky thing and just filter through the
      // datasets in memory.
      const datasets = await LocalDatasetClient.getAll();

      const filteredDatasets =
        params?.entityConfigId ?
          applyFiltersToRows(datasets, {
            name: { eq: `entity__${params.entityConfigId}` },
          })
        : datasets.filter((dataset) => {
            return dataset.name.startsWith("entity__");
          });

      if (filteredDatasets.length === 0) {
        return [];
      }

      // there should only be one, if not, choose the first one
      const entityDataset = filteredDatasets[0];
      if (entityDataset) {
        const parsedDataset = await LocalDatasetClient.hydrateDataset({
          dataset: entityDataset,
        });

        const entities = parsedDataset.data.map((row) => {
          return EntityReadSchema.parse(row);
        });

        return entities;
      }
      return [];
    },
  },
  {
    queryFns: ["getAll", "getById", "getAllFields"],
    mutationFns: [],
  },
);
