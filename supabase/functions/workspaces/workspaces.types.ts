import type { APITypeDef } from "../_shared/MiniServer/api.types.ts";
import type { Tables } from "$/types/database.types.ts";

export type WorkspacesAPI = APITypeDef<
  "workspaces",
  ["/validate-slug", "/:workspaceSlug/invite"],
  {
    "/validate-slug": {
      POST: {
        body: {
          slug: string;
        };
        returnType:
          | {
              isValid: true;
            }
          | {
              isValid: false;
              reason: string;
            };
      };
    };

    /**
     * Send a workspace invite to an email address.
     *
     * @param pathParams.workspaceSlug - The slug of the workspace to invite
     * the user to.
     * @param body.emailToInvite - The email address to invite.
     * @param body.role - The role of the user invited.
     */
    "/:workspaceSlug/invite": {
      POST: {
        pathParams: {
          workspaceSlug: string;
        };
        body: {
          emailToInvite: string;
          role: "admin" | "member";
        };
        returnType: Tables<"workspace_invites">;
      };
    };

    /**
     * Fetches a workspace invite by its ID and user email.
     *
     * @param pathParams.workspaceSlug - The slug of the workspace the invite
     * belongs to.
     * @param pathParams.inviteId - The ID of the invite we are looking up.
     * @param queryParams.email - The email address of the invited user.
     */
    "/invites/:inviteId": {
      GET: {
        pathParams: {
          inviteId: string;
        };
        queryParams: {
          workspaceSlug: string;
          email: string;
        };
        returnType: {
          invite: Tables<"workspace_invites"> | null;
        };
      };
    };

    /**
     * Given an invite ID and user id, accepts the invite if it is a valid
     * invite. An invite is valid if:
     * - it exists
     * - it is associated with the given workspace slug and email
     * - a user with the given email exists and they were the requesting user
     * - it is not already accepted
     *
     * @param pathParams.workspaceSlug - The slug of the workspace the invite
     * belongs to.
     * @param pathParams.inviteId - The ID of the invite we are looking up.
     * @param body.userId - The id of the user accepting the invite. This will
     * get written to the `user_id` column of the invite row.
     */
    "/invites/:inviteId/accept": {
      POST: {
        pathParams: {
          inviteId: string;
        };
        body: {
          userId: string;
          workspaceSlug: string;
        };
        returnType: {
          invite: Tables<"workspace_invites">;
          membership: Tables<"workspace_memberships">;
          profile: Tables<"user_profiles">;
          role: Tables<"user_roles">;
        };
      };
    };
  }
>;
