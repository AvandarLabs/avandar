import { StructuredDuckDBQueryConfig } from "@/clients/DuckDBClient/types";
import { UUID } from "@/lib/types/common";
import { DatasetId } from "@/models/datasets/Dataset";
import { EntityConfigWith } from "@/models/EntityConfig/types";
import { WorkspaceId } from "@/models/Workspace/types";

// TODO(jpsyx): move this into some common type for all your models
type BaseModel<T extends string> = {
  id: UUID<T>;
};

type PersistableModel<T extends string> = BaseModel<T> & {
  createdAt: Date;
  updatedAt: Date;
};

export type QueryPlan = BaseModel<"QueryPlan"> & {
  /**
   * All queries to be executed, grouped together by their dependencies,
   * so we can more efficiently load and query data in parallel.
   */
  queryGroups: ReadonlyArray<{
    dependencies: {
      /** The list of datasets that need to be loaded into the frontend */
      datasetIdsToLoad: readonly DatasetId[];
    };

    /**
     * The list of queries to run. All queries are DuckDB queries,
     * which implies all data must be loaded into local memory first.
     *
     * These queries can only run after their dependencies have been loaded
     * into DuckDB. Therefore, do not include queries here that do not
     * depend on one of the datasets in `datasetIdsToLoad`, otherwise
     * it will be blocked unnecessarily.
     */
    queriesToRun: readonly StructuredDuckDBQueryConfig[];
  }>;
};

/**
 * A DataExtract step runs a query plan. All `queryGroups` in a query plan
 * are run in parallel and each singular query that gets executed creates
 * a new temporary table in DuckDB, to be used by the any Transform steps.
 */
export type NEW_DataExtractStepConfig =
  PersistableModel<"DataExtractStepConfig"> & {
    queryPlan: QueryPlan;
  };

export type CreateEntitiesStepConfig =
  PersistableModel<"CreateEntitiesStepConfig"> & {
    entityConfig: BuildableEntityConfig;
  };

export type DataPullStepConfig = PersistableModel<"DataPullStepConfig"> & {
  datasetId: DatasetId;
  sourceType: "local";
};

export type PipelineStepConfig = {
  pull_data: DataPullStepConfig;
  NEW_pull_data: NEW_DataExtractStepConfig;
  create_entities: CreateEntitiesStepConfig;
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
