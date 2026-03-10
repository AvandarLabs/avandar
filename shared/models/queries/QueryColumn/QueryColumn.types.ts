import type { QueryAggregationType } from "../QueryAggregationType/QueryAggregationType.types.ts";
import type { Model } from "@avandar/models";
import type { UUID } from "@avandar/utils";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn.types.ts";
import type { EntityFieldConfig } from "$/models/EntityConfig/EntityFieldConfig/EntityFieldConfig.types.ts";

type ModelType = "QueryColumn";

export type QueryColumnId = UUID<ModelType>;

export type QueryColumn = Model.Base<
  ModelType,
  {
    id: QueryColumnId;
    baseColumn: DatasetColumn | EntityFieldConfig;
    aggregation: QueryAggregationType | undefined;
  }
>;
