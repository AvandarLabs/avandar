import { ModelTypeKey } from "@/models/Model";
import { Dataset } from "@/models/datasets/Dataset";
import { EntityConfig } from "@/models/EntityConfig";
import { DistributedPick } from "type-fest";

export type QueryDataSource = Dataset | EntityConfig;
export type QueryDataSourceTypedId = DistributedPick<
  QueryDataSource,
  ModelTypeKey | "id"
>;
export type QueryDataSourceId = QueryDataSource["id"];
