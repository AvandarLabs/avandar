import { UUID } from "$/lib/types/common";
import { SetOptional } from "type-fest";
import { SupabaseModelCRUDTypes } from "@/lib/models/SupabaseModelCRUDTypes";
import { EntityConfigId } from "@/models/EntityConfig/EntityConfig.types";
import { WorkspaceId } from "@/models/Workspace/Workspace.types";

export type EntityId = UUID<"Entity">;

type EntityRead = {
  assignedTo: string | undefined;
  createdAt: string;
  entityConfigId: EntityConfigId;
  externalId: string;
  id: EntityId;
  name: string;
  status: string;
  updatedAt: string;
  workspaceId: WorkspaceId;
};

/**
 * CRUD type definitions for the Workspace model.
 */
export type EntityModel = SupabaseModelCRUDTypes<
  {
    tableName: "entities";
    modelName: "Entity";
    modelPrimaryKeyType: EntityId;
    modelTypes: {
      Read: EntityRead;
      Insert: SetOptional<
        EntityRead,
        "assignedTo" | "createdAt" | "id" | "updatedAt"
      >;
      Update: Partial<EntityRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;

export type Entity<K extends keyof EntityModel = "Read"> = EntityModel[K];
