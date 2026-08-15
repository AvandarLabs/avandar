import {
  defineRoutes,
  GET,
  POST,
} from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { hasSubscriptionPermission } from "@sbfn/subscriptions/services/hasSubscriptionPermission.ts";
import {
  getRoleGroupIdFromAcceptedInvite,
  WorkspaceInviteRoleOverrideSchema,
} from "@sbfn/workspaces/getRoleGroupIdFromAcceptedInvite/getRoleGroupIdFromAcceptedInvite.ts";
import { EmailClient } from "$/EmailClient/EmailClient.tsx";
import { Permissions } from "$/models/Permissions/Permissions.ts";
import { z } from "zod";
import type { WorkspacesAPI } from "@sbfn/workspaces/WorkspacesRoutes.types.ts";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { AppType, RoleLevel } from "$/models/Permissions/Permissions.ts";
import type { User } from "$/models/User/User.ts";
import type { Workspace } from "$/models/Workspace/Workspace.ts";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types.ts";
import type { Tables } from "$/types/database.types.ts";

const SLUG_MIN_LENGTH = 3;
const SLUG_MAX_LENGTH = 20;

type AcceptInviteOptions = {
  inviteId: string;
  userId: string;
  workspaceSlug: string;
  supabaseAdminClient: AvaSupabaseDBClient;
};

type InviteAcceptanceContext = {
  workspaceId: Workspace.Id;
  user: SupabaseUser & { email: string };
  invite: Tables<"workspace_invites">;
};

type CreateMembershipFromInviteOptions = InviteAcceptanceContext & {
  client: AvaSupabaseDBClient;
};

type InviteMembershipResult = {
  updatedInvite: Tables<"workspace_invites">;
  membership: Tables<"workspace_memberships">;
};

type CreateInviteeProfileOptions = InviteAcceptanceContext & {
  client: AvaSupabaseDBClient;
  membershipId: string;
};

type AcceptedWorkspaceInvite = InviteMembershipResult & {
  profile: Tables<"user_profiles">;
};

async function _getInviteAcceptanceContext(
  options: Readonly<AcceptInviteOptions>,
): Promise<InviteAcceptanceContext> {
  const [{ data: workspace }, { data }] = await Promise.all([
    options.supabaseAdminClient
      .from("workspaces")
      .select("id")
      .eq("slug", options.workspaceSlug)
      .single()
      .throwOnError(),
    options.supabaseAdminClient.auth.admin.getUserById(options.userId),
  ]);
  if (!data.user?.email) {
    throw new Error("User not found");
  }
  const { data: invite } = await options.supabaseAdminClient
    .from("workspace_invites")
    .select("*")
    .match({
      id: options.inviteId,
      email: data.user.email,
      workspace_id: workspace.id,
    })
    .maybeSingle()
    .throwOnError();
  if (!invite) {
    throw new Error("Sorry! No invitation was found.");
  }
  if (invite.invite_status === "accepted") {
    throw new Error("This invite has already been accepted.");
  }
  return { workspaceId: workspace.id, user: data.user, invite };
}

async function _createMembershipFromInvite(
  options: Readonly<CreateMembershipFromInviteOptions>,
): Promise<InviteMembershipResult> {
  const { client, workspaceId, user, invite } = options;
  const [{ data: updatedInvite }, roleGroupId] = await Promise.all([
    client
      .from("workspace_invites")
      .update({ invite_status: "accepted", user_id: user.id })
      .eq("id", invite.id)
      .select()
      .single()
      .throwOnError(),
    getRoleGroupIdFromAcceptedInvite({
      supabaseAdminClient: client,
      workspaceId,
      invite,
    }),
  ]);
  const { data: membership } = await client
    .from("workspace_memberships")
    .insert({
      workspace_id: workspaceId,
      user_id: user.id,
      role_group_id: roleGroupId,
    })
    .select()
    .single()
    .throwOnError();
  return { updatedInvite, membership };
}

async function _createInviteeProfileAndTags(
  options: Readonly<CreateInviteeProfileOptions>,
): Promise<Tables<"user_profiles">> {
  const { client, workspaceId, user, invite, membershipId } = options;
  const { data: profile } = await client
    .from("user_profiles")
    .insert({
      workspace_id: workspaceId,
      user_id: user.id,
      membership_id: membershipId,
      full_name: user.email,
      display_name: user.email,
    })
    .select()
    .single()
    .throwOnError();
  const tagIds = invite.invite_user_group_ids ?? [];
  if (tagIds.length > 0) {
    await client
      .from("user_group_memberships")
      .insert(
        tagIds.map((userGroupId) => {
          return {
            user_group_id: userGroupId,
            user_id: user.id,
          };
        }),
      )
      .throwOnError();
  }
  return profile;
}

async function _acceptWorkspaceInvite(
  options: Readonly<AcceptInviteOptions>,
): Promise<AcceptedWorkspaceInvite> {
  const context = await _getInviteAcceptanceContext(options);
  const { updatedInvite, membership } = await _createMembershipFromInvite({
    client: options.supabaseAdminClient,
    ...context,
  });
  const profile = await _createInviteeProfileAndTags({
    client: options.supabaseAdminClient,
    ...context,
    membershipId: membership.id,
  });
  return { invite: updatedInvite, membership, profile };
}

/**
 * This is the route handler for all workspaces endpoints.
 */
export const WorkspacesRoutes = defineRoutes<WorkspacesAPI>("workspaces", {
  /**
   * Validate a workspace slug.
   * All error messages use the word "ID" instead of "slug" because the
   * message is intended to be displayed to the user, and 'ID' is a more
   * user-friendly term than 'slug'.
   */
  "/validate-slug": {
    POST: POST("/validate-slug")
      .bodySchema({
        slug: z.string(),
      })
      .disableJWTVerification()
      .action(async ({ body: { slug }, supabaseAdminClient }) => {
        const { data: workspaces } = await supabaseAdminClient
          .from("workspaces")
          .select("id")
          .eq("slug", slug);

        if (workspaces && workspaces.length > 0) {
          return {
            isValid: false,
            reason: "This workspace ID is already taken",
          };
        }

        // now check that the slug has no spaces or invalid URL characters
        if (slug.includes(" ")) {
          return {
            isValid: false,
            reason: "The workspace ID cannot contain spaces",
          };
        }

        if (!slug.match(/^[a-zA-Z0-9-]+$/)) {
          return {
            isValid: false,
            reason:
              "The workspace ID can only contain letters, numbers, and hyphens",
          };
        }

        // now check that the slug is the right length
        if (slug.length < SLUG_MIN_LENGTH) {
          return {
            isValid: false,
            reason: `This workspace ID is too short. It must be at least ${SLUG_MIN_LENGTH} characters.`,
          };
        }
        if (slug.length > SLUG_MAX_LENGTH) {
          return {
            isValid: false,
            reason: `This workspace ID is too long. It cannot be longer than ${SLUG_MAX_LENGTH} characters.`,
          };
        }

        return { isValid: true };
      }),
  },

  "/:workspaceId/invite": {
    POST: POST({
      path: "/:workspaceId/invite",
      schema: {
        workspaceId: z.uuid(),
      },
    })
      .bodySchema(
        z.object({
          emailToInvite: z.string(),
          roleGroupId: z.uuid(),
          roleOverrides: z.array(WorkspaceInviteRoleOverrideSchema).optional(),
          userGroupIds: z.array(z.uuid()).optional(),
        }),
      )
      .action(
        async ({
          pathParams: { workspaceId },
          body,
          supabaseClient,
          supabaseAdminClient,
          user,
        }) => {
          const { emailToInvite, roleGroupId, roleOverrides, userGroupIds } =
            body;
          // look up the workspace
          const { data: workspace } = await supabaseClient
            .from("workspaces")
            .select("name, id, slug")
            .eq("id", workspaceId)
            .single()
            .throwOnError();

          const { data: isSettingsAdmin } = await supabaseClient.rpc(
            "util__is_settings_admin",
            { p_workspace_id: workspace.id },
          );
          if (!isSettingsAdmin) {
            throw new Error("Only settings administrators can invite members.");
          }

          // is the user already registered?
          const { data: invitedUserId } = await supabaseAdminClient.rpc(
            "util__get_user_id_by_email",
            { p_email: emailToInvite },
          );

          // if yes, are they already a member of the workspace?
          if (invitedUserId) {
            const { data: workspaceMembers } = await supabaseClient
              .from("user_profiles")
              .select("user_id")
              .eq("user_id", invitedUserId)
              .eq("workspace_id", workspace.id);

            if (workspaceMembers && workspaceMembers.length > 0) {
              throw new Error(
                "This user is already a member of the workspace.",
              );
            }
          }

          // is the workspace allowed to invite more members?
          const canInviteUsers = await hasSubscriptionPermission({
            workspaceId: workspaceId as Workspace.Id,
            permissionType: "can_invite_users",
            supabaseAdminClient,
            userId: user.id as User.Id,
          });
          if (!canInviteUsers) {
            throw new Error("Your workspace cannot invite any more members.");
          }

          // now, we check if this email has already been invited to this
          // workspace
          const { data: existingInvites } = await supabaseClient
            .from("workspace_invites")
            .select("id")
            .eq("email", emailToInvite)
            .eq("workspace_id", workspace.id)
            .throwOnError();
          if (existingInvites && existingInvites.length > 0) {
            throw new Error("This email has already been invited.");
          }

          const tagIds = userGroupIds ?? [];
          if (tagIds.length > 0) {
            const { data: tagRows } = await supabaseClient
              .from("user_groups")
              .select("id")
              .eq("workspace_id", workspace.id)
              .in("id", tagIds)
              .throwOnError();
            if (!tagRows || tagRows.length !== tagIds.length) {
              throw new Error(
                "One or more tags are invalid for this workspace.",
              );
            }
          }

          const { data: roleGroupRows } = await supabaseClient
            .from("role_group_app_roles")
            .select("app, role")
            .eq("role_group_id", roleGroupId)
            .throwOnError();

          const baseMatrix = Permissions.RolesMatrix.rowsToUserAppRolesMatrix(
            (roleGroupRows ?? []).map((row) => {
              return {
                app: row.app as AppType,
                role: row.role as RoleLevel,
              };
            }),
          );
          const mergedMatrix =
            (roleOverrides ?? []).length === 0 ?
              baseMatrix
            : Permissions.RolesMatrix.applyRoleOverridesToMatrix(
                baseMatrix,
                roleOverrides ?? [],
              );
          const inviteRoleMirror =
            mergedMatrix.settings === "admin" ? "admin" : "member";

          // it's finally safe to create the invite row
          const { data: invite } = await supabaseClient
            .from("workspace_invites")
            .insert({
              email: emailToInvite,
              user_id: invitedUserId,
              workspace_id: workspace.id,
              invited_by: user.id,
              invite_status: "pending",
              role: inviteRoleMirror,
              role_group_id: roleGroupId,
              role_overrides: roleOverrides ?? [],
              invite_user_group_ids: tagIds,
            })
            .select()
            .single()
            .throwOnError();

          // now send the invitation.
          await EmailClient.sendNotificationEmail({
            type: "workspace_invite",
            recipientEmail: emailToInvite,
            workspaceSlug: workspace.slug,
            workspaceName: workspace.name,
            inviteId: invite.id,
          });

          return invite;
        },
      ),
  },

  "/invites/:inviteId": {
    GET: GET({
      path: "/invites/:inviteId",
      schema: {
        inviteId: z.uuid(),
      },
    })
      .querySchema({
        workspaceSlug: z.string(),
        email: z.string(),
      })
      .action(
        async ({
          pathParams: { inviteId },
          queryParams: { email, workspaceSlug },
          supabaseAdminClient,
        }) => {
          const { data: workspace } = await supabaseAdminClient
            .from("workspaces")
            .select("id")
            .eq("slug", workspaceSlug)
            .single()
            .throwOnError();

          const { data: invite } = await supabaseAdminClient
            .from("workspace_invites")
            .select("*")
            .match({
              id: inviteId,
              workspace_id: workspace.id,
              email,
            })
            .maybeSingle()
            .throwOnError();
          return { invite };
        },
      ),
  },

  "/invites/:inviteId/accept": {
    POST: POST({
      path: "/invites/:inviteId/accept",
      schema: {
        inviteId: z.uuid(),
      },
    })
      .bodySchema({
        userId: z.uuid(),
        workspaceSlug: z.string(),
      })
      .action(
        async ({
          pathParams: { inviteId },
          body: { userId, workspaceSlug },
          supabaseAdminClient,
        }) => {
          return _acceptWorkspaceInvite({
            inviteId,
            userId,
            workspaceSlug,
            supabaseAdminClient,
          });
        },
      ),
  },
});
