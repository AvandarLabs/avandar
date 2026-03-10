import type { SupabaseCRUDClientModelSpec } from "@avandar/clients";
import type { UUID } from "@avandar/utils";
import type { EntityConfigId } from "$/models/EntityConfig/EntityConfig.types.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { SetOptional } from "type-fest";

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
  workspaceId: Workspace.Id;
};

/**
 * CRUD type definitions for the Workspace model.
 */
export type EntityModel = SupabaseCRUDClientModelSpec<
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
