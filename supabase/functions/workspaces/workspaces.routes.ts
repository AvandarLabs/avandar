import { EmailClient } from "$/EmailClient/EmailClient.tsx";
import { z } from "zod";
import { defineRoutes, POST } from "../_shared/MiniServer/MiniServer.ts";
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

        console.log("slug", slug);

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

  "/:workspaceSlug/invite": {
    POST: POST({
      path: "/:workspaceSlug/invite",
      schema: {
        workspaceSlug: z.string(),
      },
    })
      .bodySchema({
        emailToInvite: z.string(),
        role: z.enum(["admin", "member"]),
      })
      .action(
        async ({
          pathParams: { workspaceSlug },
          body: { emailToInvite, role },
          supabaseClient,
          supabaseAdminClient,
          user,
        }) => {
          console.log("params", { workspaceSlug, emailToInvite, role });

          // look up the workspace
          const { data: workspace } = await supabaseClient
            .from("workspaces")
            .select("name, id, slug")
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

          // is the workspace already at the max number of members?
          const { count } = await supabaseClient
            .from("user_profiles")
            .select("*", { count: "exact", head: true })
            .eq("workspace_id", workspace.id)
            .throwOnError();
          if (count && count >= 2) {
            throw new Error(
              "Your workspace cannot have more than two members on the free plan",
            );
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
              workspace_id: workspace.id,
              invited_by: user.id,
              invite_status: "pending",
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

          return { invite };
        },
      ),
  },
});
