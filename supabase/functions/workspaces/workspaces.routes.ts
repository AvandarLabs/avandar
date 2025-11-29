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
        }) => {
          console.log("params", { workspaceSlug, emailToInvite, role });
          await EmailClient.sendNotificationEmail({
            type: "workspace_invite",
            recipientEmail: emailToInvite,
            workspaceSlug,
            workspaceName: "Test Workspace",
            inviteId: "123",
          });

          return await Promise.resolve({
            inviteId: "123",
          });
        },
      ),
  },
});
