import type { Workspace } from "$/models/Workspace/Workspace";
import type { Database } from "$/types/database.types";

/** Resource categories accepted by the effective-role permission query. */
export type ResourceType = Database["public"]["Enums"]["resource_type"];

/** Workspace user-group identity and display properties. */
export type UserGroupRow = {
  id: string;
  workspaceId: Workspace.Id;
  name: string;
  color: string;
};
