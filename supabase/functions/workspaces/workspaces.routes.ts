import {
  defineRoutes,
  GET,
  POST,
} from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { hasSubscriptionPermission } from "@sbfn/subscriptions/services/hasSubscriptionPermission.ts";
import { resolveRoleGroupIdForAcceptedInvite } from "@sbfn/workspaces/inviteRoleResolution.ts";
import { EmailClient } from "$/EmailClient/EmailClient.tsx";
import { PermissionsModule } from "$/models/Permissions/PermissionsModule/PermissionsModule.ts";
import { z } from "zod";
import type { WorkspacesAPI } from "@sbfn/workspaces/workspaces.routes.types.ts";
import type {
  AppType,
  RoleLevel,
} from "$/models/Permissions/Permissions.types.ts";
import type { WorkspaceId } from "$/models/Workspace/Workspace.types.ts";

const SLUG_MIN_LENGTH = 3;
const SLUG_MAX_LENGTH = 20;

/**
 * This is the route handler for all workspaces endpoints.
 */
export const Routes = defineRoutes<WorkspacesAPI>("workspaces", {
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
        z
          .object({
            emailToInvite: z.string(),
            role: z.enum(["admin", "member"]).optional(),
            roleGroupId: z.uuid().optional(),
            roleOverrides: z
              .array(
                z.object({
                  app: z.enum([
                    "data_sources",
                    "data_explorer",
                    "dashboards",
                    "settings",
                  ]),
                  role: z.enum(["viewer", "editor", "admin"]),
                }),
              )
              .optional(),
            userGroupIds: z.array(z.uuid()).optional(),
          })
          .superRefine((data, ctx) => {
            // either roleGroupId or role are allowed to be empty, but not both.
            // so we do additional validation here to ensure at least one of
            // them exists.
            if (!data.roleGroupId && !data.role) {
              ctx.addIssue({
                code: "custom",
                message: "roleGroupId or role is required",
                path: ["roleGroupId"],
              });
            }
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
          const {
            emailToInvite,
            role,
            roleGroupId,
            roleOverrides,
            userGroupIds,
          } = body;
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
            workspaceId: workspaceId as WorkspaceId,
            permissionType: "can_invite_users",
            supabaseAdminClient,
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

          let resolvedRoleGroupId = roleGroupId;
          if (!resolvedRoleGroupId) {
            const builtinName =
              role === "admin" ? "Global Admin" : "Global Viewer";
            const { data: builtin } = await supabaseClient
              .from("role_groups")
              .select("id")
              .eq("workspace_id", workspace.id)
              .eq("name", builtinName)
              .eq("is_builtin", true)
              .single()
              .throwOnError();
            resolvedRoleGroupId = builtin.id;
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

          const legacyRole = role ?? "member";

          // it's finally safe to create the invite row
          const { data: invite } = await supabaseClient
            .from("workspace_invites")
            .insert({
              email: emailToInvite,
              user_id: invitedUserId,
              workspace_id: workspace.id,
              invited_by: user.id,
              invite_status: "pending",
              role: legacyRole,
              role_group_id: resolvedRoleGroupId,
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
          const { data: workspace } = await supabaseAdminClient
            .from("workspaces")
            .select("id")
            .eq("slug", workspaceSlug)
            .single()
            .throwOnError();
          const {
            data: { user },
          } = await supabaseAdminClient.auth.admin.getUserById(userId);

          if (!user || !user.email) {
            throw new Error("User not found");
          }

          const { data: invite } = await supabaseAdminClient
            .from("workspace_invites")
            .select("*")
            .match({
              id: inviteId,
              email: user?.email,
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

          // now mark it as accepted and link it to the user's account
          const { data: updatedInvite } = await supabaseAdminClient
            .from("workspace_invites")
            .update({
              invite_status: "accepted",
              user_id: user.id,
            })
            .eq("id", invite.id)
            .select()
            .single()
            .throwOnError();

          const membershipRoleGroupId =
            await resolveRoleGroupIdForAcceptedInvite({
              supabaseAdminClient: supabaseAdminClient,
              workspaceId: workspace.id,
              invite,
            });

          // create the workspace membership
          const { data: membership } = await supabaseAdminClient
            .from("workspace_memberships")
            .insert({
              workspace_id: workspace.id,
              user_id: user.id,
              role_group_id: membershipRoleGroupId,
            })
            .select()
            .single()
            .throwOnError();

          const { data: roleRows } = await supabaseAdminClient
            .from("role_group_app_roles")
            .select("app, role")
            .eq("role_group_id", membershipRoleGroupId)
            .throwOnError();

          const mergedMatrix =
            PermissionsModule.RolesMatrix.rowsToUserAppRolesMatrix(
              (roleRows ?? []).map((row) => {
                return {
                  app: row.app as AppType,
                  role: row.role as RoleLevel,
                };
              }),
            );
          const legacyRole =
            PermissionsModule.RolesMatrix.legacyWorkspaceRoleFromMatrix(
              mergedMatrix,
            );

          // create the user profile
          const { data: profile } = await supabaseAdminClient
            .from("user_profiles")
            .insert({
              workspace_id: workspace.id,
              user_id: user.id,
              membership_id: membership.id,
              full_name: user.email,
              display_name: user.email,
            })
            .select()
            .single()
            .throwOnError();

          // create the user role
          const { data: role } = await supabaseAdminClient
            .from("user_roles")
            .insert({
              workspace_id: workspace.id,
              user_id: user.id,
              membership_id: membership.id,
              role: legacyRole,
            })
            .select()
            .single()
            .throwOnError();

          const tagIds = invite.invite_user_group_ids ?? [];
          if (tagIds.length > 0) {
            await supabaseAdminClient
              .from("user_group_memberships")
              .insert(
                tagIds.map((userGroupId) => {
                  return { user_group_id: userGroupId, user_id: user.id };
                }),
              )
              .throwOnError();
          }

          return { invite: updatedInvite, membership, profile, role };
        },
      ),
  },
});
