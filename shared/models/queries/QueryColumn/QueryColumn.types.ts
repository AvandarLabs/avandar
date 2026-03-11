import type { QueryAggregationType } from "../QueryAggregationType/QueryAggregationType.types.ts";
import type { Model } from "@models/Model/Model.ts";
import type { UUID } from "@utils/types/common.ts";
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
