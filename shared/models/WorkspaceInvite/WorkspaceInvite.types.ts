import type { Model } from "@models/Model/Model.ts";
import type { UUID } from "@utils/types/common.types.ts";
import type { SwapDeep } from "@utils/types/utilities.types.ts";
import type { SupabaseCrudModelSpec } from "$/models/SupabaseCrudModelSpec.ts";
import type { UserId } from "$/models/User/User.types.ts";
import type {
  WorkspaceId,
  WorkspaceRole,
} from "$/models/Workspace/Workspace.types.ts";
import type { Json } from "$/types/database.types.ts";
import type { SetOptional } from "type-fest";

type ModelType = "WorkspaceInvite";

export type WorkspaceInviteId = UUID<ModelType>;

export type WorkspaceInviteStatus = "pending" | "accepted";

/** Pending invite row with joined role group display name (list queries). */
export type WorkspaceInviteReadWithRoleGroupName = WorkspaceInviteRead & {
  roleGroupName: string | null;
};

export type WorkspaceInviteRead = Model.Base<
  ModelType,
  {
    id: WorkspaceInviteId;
    workspaceId: WorkspaceId;
    email: string;
    invitedBy: UserId;
    userId: UserId | undefined;
    role: WorkspaceRole;
    roleGroupId: string | undefined;
    roleOverrides: SwapDeep<Json, null, undefined>;
    inviteUserGroupIds: string[];
    inviteStatus: WorkspaceInviteStatus;
    createdAt: string;
    updatedAt: string;
  }
>;

export type WorkspaceInviteModel = SupabaseCrudModelSpec<
  {
    tableName: "workspace_invites";
    modelName: "WorkspaceInvite";
    modelPrimaryKeyType: WorkspaceInviteId;
    modelTypes: {
      Read: WorkspaceInviteRead;
      Insert: SetOptional<
        WorkspaceInviteRead,
        "id" | "createdAt" | "updatedAt"
      >;
      Update: Partial<WorkspaceInviteRead>;
    };
  },
  {
    dbTablePrimaryKey: "id";
  }
>;
