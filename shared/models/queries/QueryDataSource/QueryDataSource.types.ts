import type { Model } from "@avandar/models";
import type { Dataset } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { EntityConfig } from "$/models/EntityConfig/EntityConfig.types.ts";

export type QueryDataSource = Dataset | EntityConfig;
export type QueryDataSourceTypedId = Model.TypedId<QueryDataSource>;
export type QueryDataSourceId = QueryDataSource["id"];
