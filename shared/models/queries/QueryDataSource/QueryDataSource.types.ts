import type { Model } from "@models/Model/Model.ts";
import type { DatasetModel } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { EntityConfigModel } from "$/models/EntityConfig/EntityConfig.types.ts";

export type QueryDataSource = DatasetModel["Read"] | EntityConfigModel["Read"];
export type QueryDataSourceTypedId = Model.TypedId<QueryDataSource>;
export type QueryDataSourceId = QueryDataSource["id"];
