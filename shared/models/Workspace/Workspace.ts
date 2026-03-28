/* eslint-disable @typescript-eslint/no-namespace */
import { Tables } from "$/types/database.types.ts";
import type {
  WorkspaceId,
  WorkspaceModel,
  WorkspaceRole,
  WorkspaceWithSubscription,
} from "$/models/Workspace/Workspace.types.ts";

export namespace Workspace {
  export type T<K extends keyof WorkspaceModel = "Read"> = WorkspaceModel[K];
  export type Id = WorkspaceId;
  export type Role = WorkspaceRole;
  export type WithSubscription = WorkspaceWithSubscription;
  export type Invite = Tables<"workspace_invites">;
}
