/* eslint-disable @typescript-eslint/no-namespace */
import type {
  WorkspaceInviteId,
  WorkspaceInviteModel,
} from "$/models/WorkspaceInvite/WorkspaceInvite.types.ts";

export { WorkspaceInviteParsers } from "$/models/WorkspaceInvite/WorkspaceInviteParsers.ts";

export namespace WorkspaceInvite {
  export type T<K extends keyof WorkspaceInviteModel = "Read"> =
    WorkspaceInviteModel[K];
  export type Id = WorkspaceInviteId;
}
