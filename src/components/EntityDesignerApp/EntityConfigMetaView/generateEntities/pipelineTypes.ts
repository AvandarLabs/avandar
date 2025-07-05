import { UUID } from "@/lib/types/common";
import { EntityConfigWith } from "@/models/EntityConfig/types";
import { FieldDataType } from "@/models/LocalDataset/LocalDatasetField/types";
import { LocalDataset, LocalDatasetId } from "@/models/LocalDataset/types";
import { WorkspaceId } from "@/models/Workspace/types";

type BaseModel<T extends string> = {
  id: UUID<T>;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateEntitiesStepConfig = BaseModel<"CreateEntitiesStepConfig"> & {
  entityConfig: BuildableEntityConfig;
};

export type PullDataStepConfig = BaseModel<"DataPullStepConfig"> & {
  datasetId: LocalDatasetId;
  datasetType: "local";
};

export type OutputDatasetsStepConfig =
  BaseModel<"DatasetCreationStepConfig"> & {
    datasetId: string;
    datasetName: string;
    datasetType: LocalDataset["datasetType"];

    // The pipeline context from where we should get the data
    // This should be an array of objects.
    contextValueKey: string;

    columnsToWrite: Array<{ name: string; dataType: FieldDataType }>;
  };

export type PipelineStepConfig = {
  pull_data: PullDataStepConfig;
  create_entities: CreateEntitiesStepConfig;
  output_datasets: OutputDatasetsStepConfig;
};

export type PipelineStepType = keyof PipelineStepConfig;

// TODO(jpsyx): add ability to roll back a pipeline or a pipeline step
export type PipelineStep = {
  id: UUID<"PipelineStep">;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
} & {
  [StepType in PipelineStepType]: {
    type: StepType;
    relationships: {
      stepConfig: PipelineStepConfig[StepType];
    };
  };
}[PipelineStepType];

// pipelines have a start, middle steps, and two output datasets.
// dataset 1 are all the field values (one row per value)
// dataset 2 are the entities (one row per entity)
// finally, entities are created from that output dataset.
// - one entity per row from entity_dataset
// - for each entity, we create a field value from the field_values dataset
// The field value dataset should be of the form
//  id, entity_id, field_id, value, all_values, datasource_id
export type Pipeline = {
  id: UUID<"Pipeline">;
  workspaceId: WorkspaceId;
  createdAt: Date;
  updatedAt: Date;
  name: string;
  relationships: {
    steps: readonly PipelineStep[];
  };
};

export type BuildableEntityConfig = EntityConfigWith<
  "datasets" | "fields" | `fields.${number}.valueExtractor`
>;

export type BuildableFieldConfig = BuildableEntityConfig["fields"][number];
