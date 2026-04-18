import type { Model } from "@models/Model/Model.ts";
import type { UUID } from "@utils/types/common.types.ts";
import type { DatasetColumnRead } from "$/models/datasets/DatasetColumn/DatasetColumn.types.ts";
import type { EntityFieldConfigModel } from "$/models/EntityConfig/EntityFieldConfig/EntityFieldConfig.types.ts";
import type { QueryAggregationTypeT } from "$/models/queries/QueryAggregationType/QueryAggregationType.types.ts";

type ModelType = "QueryColumn";

export type QueryColumnId = UUID<ModelType>;

export type QueryColumnRead = Model.Base<
  ModelType,
  {
    id: QueryColumnId;
    baseColumn: DatasetColumnRead | EntityFieldConfigModel["Read"];
    aggregation: QueryAggregationTypeT | undefined;
  }
>;
