import type { EntityId } from "../Entity/Entity.types.ts";
import type { UUID } from "@utils/types/common.types.ts";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types.ts";
import type { EntityConfigId } from "$/models/EntityConfig/EntityConfig.types.ts";
import type { EntityFieldConfigId } from "$/models/EntityConfig/EntityFieldConfig/EntityFieldConfig.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";

export type EntityFieldValueId = UUID<"EntityFieldValue">;

export type EntityFieldValue = {
  createdAt: string;
  datasetId: DatasetId | undefined;
  entityFieldConfigId: EntityFieldConfigId;
  entityId: EntityId;
  entityConfigId: EntityConfigId;
  id: EntityFieldValueId;
  updatedAt: string;
  value: unknown;
  valueSet: unknown[];
  workspaceId: Workspace.Id;
};
