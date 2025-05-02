import { Logger } from "@/lib/Logger";
import { UUID } from "@/lib/types/common";
import {
  EntityFieldConfig,
  EntityFieldConfigId,
} from "@/models/EntityConfig/EntityFieldConfig/types";
import {
  EntityConfig,
  EntityConfigId,
  EntityConfigWith,
} from "@/models/EntityConfig/types";
import { LocalDataset, LocalDatasetId } from "@/models/LocalDataset/types";
import { UserId } from "@/models/User";

type EntityFieldValue = {
  id: UUID<"EntityFieldValue">;
  entityId: UUID<"Entity">;
  fieldId: EntityFieldConfigId;
  field: EntityFieldConfig;
  value: unknown;
  allValues: unknown[];
  datasourceId: LocalDatasetId;
  datasource: LocalDataset;
};

type EntityComment = {
  id: UUID<"EntityComment">;
  entityId: UUID<"Entity">;
  ownerId: UserId;
  createdAt: Date;
  updatedAt: Date;
  content: string;
};

type Entity = {
  id: UUID<"Entity">;
  configId: EntityConfigId;
  fieldValues: Record<string, EntityFieldValue>;
  config: EntityConfig;
  assignedTo: UserId;
  comments: EntityComment[];
  createdAt: Date;
  updatedAt: Date;
};

type PipelineStep = {
  id: UUID<"PipelineStep">;
  name: string;
  description: string;
  type: "dataPull" | "valueExtractor" | "entityCreation";
};

// pipelines have a start, middle steps, and two output datasets.
// dataset 1 are all the field values (one row per value)
// dataset 2 are the entities (one row per entity)
// finally, entities are created from that output dataset.
// - one entity per row from entity_dataset
// - for each entity, we create a field value from the field_values dataset
// The field value dataset should be of the form
//  id, entity_id, field_id, value, all_values, datasource_id
type Pipeline = readonly PipelineStep[];

function makePipelineFromEntityConfig(
  entityConfig: EntityConfigWith<"dataset" | "fields">,
): Pipeline {
  // Create a pipeline based on the entity configuration

  // first, pull all data
  // second, run value extractors
  // third, create entities
  return undefined;
}

function runPipeline(pipeline: Pipeline): void {
  // Run the pipeline
}

export function generateEntities(
  entityConfig: EntityConfigWith<"dataset" | "fields">,
): void {
  Logger.log("generate entities", entityConfig);

  const pipeline = makePipelineFromEntityConfig(entityConfig);
  return runPipeline(pipeline);
}
