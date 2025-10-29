import { UUID } from "@/lib/types/common";
import { QueryAggregationType } from "../QueryAggregationType";
import { DatasetColumn } from "@/models/datasets/DatasetColumn";
import {
  EntityFieldConfig,
} from "@/models/EntityConfig/EntityFieldConfig/EntityFieldConfig.types";
import { Model } from "@/models/Model";

type ModelType = "QueryColumn";

export type QueryColumnId = UUID<ModelType>;

export type QueryColumn = Model<ModelType, {
  id: QueryColumnId;
  baseColumn: DatasetColumn | EntityFieldConfig;
  aggregation: QueryAggregationType | undefined;
}>;
