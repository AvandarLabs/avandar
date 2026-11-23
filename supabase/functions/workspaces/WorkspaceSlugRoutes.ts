import { POST } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { z } from "zod";
import type { WorkspacesAPI } from "@sbfn/workspaces/WorkspacesRoutes.types.ts";

/** Minimum and maximum workspace ID lengths accepted by slug validation. */
const SLUG_MIN_LENGTH = 3;
const SLUG_MAX_LENGTH = 20;

/** Public workspace ID validation route used by WorkspacesRoutes. */
export const WorkspaceSlugRoutes = {
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
      .action(
        async ({
          body: { slug },
          supabaseAdminClient,
        }): Promise<
          WorkspacesAPI["workspaces"]["/validate-slug"]["POST"]["returnType"]
        > => {
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
        },
      ),
  },
};
