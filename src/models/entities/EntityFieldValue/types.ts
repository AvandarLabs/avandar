import { UUID } from "@/lib/types/common";
import { DatasetId } from "@/models/datasets/Dataset";
import { EntityConfigId } from "@/models/EntityConfig/EntityConfig.types";
import { EntityFieldConfigId } from "@/models/EntityConfig/EntityFieldConfig/types";
import { WorkspaceId } from "@/models/Workspace/types";
import { EntityId } from "../Entity/Entity.types";

export type EntityFieldValueId = UUID<"EntityFieldValue">;

export type EntityFieldValue = {
  createdAt: string;
  datasetId: DatasetId | undefined;
  entityFieldConfigId: EntityFieldConfigId;
  entityId: EntityId;
  entityConfigId: EntityConfigId;
  id: EntityFieldValueId;
  updatedAt: string;
  value: string | undefined;
  valueSet: string[];
  workspaceId: WorkspaceId;
};
