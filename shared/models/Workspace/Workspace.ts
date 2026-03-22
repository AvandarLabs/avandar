/* eslint-disable @typescript-eslint/no-namespace,import-x/export */
import { Tables } from "$/types/database.types.ts";
import type {
  WorkspaceFeature,
  WorkspaceId,
  WorkspaceModel,
  WorkspaceRole,
  WorkspaceWithSubscription,
} from "./Workspace.types.ts";

export { WorkspaceUtils as Workspace } from "./WorkspaceUtils.ts";

export namespace Workspace {
  export type T<K extends keyof WorkspaceModel = "Read"> = WorkspaceModel[K];
  export type Id = WorkspaceId;
  export type Role = WorkspaceRole;
  export type WithSubscription = WorkspaceWithSubscription;
  export type Invite = Tables<"workspace_invites">;
  export type Feature = WorkspaceFeature;
}
