/* eslint-disable @typescript-eslint/no-namespace */
import type {
  WorkspaceId,
  WorkspaceModel,
  WorkspaceRole,
  WorkspaceWithSubscription,
} from "$/models/Workspace/Workspace.types.ts";

export { WorkspaceParsers } from "$/models/Workspace/WorkspaceParsers.ts";

export namespace Workspace {
  export type T<K extends keyof WorkspaceModel = "Read"> = WorkspaceModel[K];
  export type Id = WorkspaceId;
  export type Role = WorkspaceRole;
  export type WithSubscription = WorkspaceWithSubscription;
}
