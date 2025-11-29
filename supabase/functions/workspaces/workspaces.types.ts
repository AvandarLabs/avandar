import type { APITypeDef } from "../_shared/MiniServer/api.types.ts";

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

    "/:workspaceSlug/invite": {
      POST: {
        pathParams: {
          workspaceSlug: string;
        };
        body: {
          emailToInvite: string;
          role: "admin" | "member";
        };
        returnType: {
          inviteId: string;
        };
      };
    };
  }
>;
