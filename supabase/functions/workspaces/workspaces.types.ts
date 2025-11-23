import type { APITypeDef } from "../_shared/MiniServer/api.types.ts";

export type WorkspacesAPI = APITypeDef<
  "workspaces",
  ["/validate-slug"],
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
  }
>;
