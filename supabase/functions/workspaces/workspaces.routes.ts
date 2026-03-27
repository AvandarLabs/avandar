import { EmailClient } from "$/EmailClient/EmailClient.tsx";
import { z } from "zod";
import { defineRoutes, GET, POST } from "../_shared/MiniServer/MiniServer.ts";
import type { WorkspacesAPI } from "./workspaces.types.ts";

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
      .bodySchema({
        emailToInvite: z.string(),
        role: z.enum(["admin", "member"]),
      })
      .action(
        async ({
          pathParams: { workspaceId },
          body: { emailToInvite, role },
          supabaseClient,
          supabaseAdminClient,
          user,
        }) => {
          // look up the workspace
          const { data: workspace } = await supabaseClient
            .from("workspaces")
            .select("name, id, slug")
            .eq("id", workspaceId)
            .single()
            .throwOnError();

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

          // look up the workspace's subscription
          const { data: subscription } = await supabaseAdminClient
            .from("subscriptions")
            .select("max_seats_allowed, feature_plan_type")
            .eq("workspace_id", workspace.id)
            .single()
            .throwOnError();

          if (!subscription) {
            throw new Error("Workspace does not have a subscription.");
          }

          // is the workspace already at the max number of members?
          const { count: memberCount } = await supabaseAdminClient
            .from("user_profiles")
            .select("*", { count: "exact", head: true })
            .eq("workspace_id", workspace.id)
            .throwOnError();

          // count pending invites against the seat limit
          const { count: pendingInviteCount } = await supabaseAdminClient
            .from("workspace_invites")
            .select("*", { count: "exact", head: true })
            .eq("workspace_id", workspace.id)
            .eq("invite_status", "pending")
            .throwOnError();

          const totalOccupiedSeats =
            (memberCount ?? 0) + (pendingInviteCount ?? 0);

          if (totalOccupiedSeats >= subscription.max_seats_allowed) {
            const message =
              subscription.feature_plan_type === "free"
                ? "Your workspace is on the Free plan, which supports up to 2 seats. To invite more team members, upgrade to a paid plan."
                : "All seats in your workspace are currently in use. Purchase an additional seat from the billing portal to invite more members.";
            throw new Error(message);
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

          // it's finally safe to create the invite row
          const { data: invite } = await supabaseClient
            .from("workspace_invites")
            .insert({
              email: emailToInvite,
              user_id: invitedUserId,
              workspace_id: workspace.id,
              invited_by: user.id,
              invite_status: "pending",
              role,
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

          // create the workspace membership
          const { data: membership } = await supabaseAdminClient
            .from("workspace_memberships")
            .insert({
              workspace_id: workspace.id,
              user_id: user.id,
            })
            .select()
            .single()
            .throwOnError();

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
              role: invite.role,
            })
            .select()
            .single()
            .throwOnError();

          return { invite: updatedInvite, membership, profile, role };
        },
      ),
  },
  "/:workspaceId/features": {
    GET: GET({
      path: "/:workspaceId/features",
      schema: {
        workspaceId: z.uuid(),
      },
    }).action(({ pathParams: { workspaceId }, supabaseAdminClient }) => {
      console.log("workspaceId", workspaceId);
      console.log("supabaseAdminClient", supabaseAdminClient);
      return { features: [] };
    }),
  },
});
